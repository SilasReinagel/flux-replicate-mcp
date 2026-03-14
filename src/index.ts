#!/usr/bin/env node

/**
 * Simple Flux Replicate MCP Server
 * Generates images using Flux models via Replicate API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ReplicateClient } from './replicate.js';
import { ImageProcessor } from './image.js';
import { TempManager } from './temp.js';
import { getConfig, ensureWorkingDirectory, calculateCost } from './config.js';
import { validationError, processingError, McpError } from './errors.js';
import { error } from './log.js';
import { join, isAbsolute, basename, dirname } from 'path';
import { promises as fs } from 'fs';

/**
 * Simple MCP Server for Flux image generation
 */
class FluxMcpServer {
  private server: Server;
  private replicateClient: ReplicateClient;
  private imageProcessor: ImageProcessor;
  private tempManager: TempManager;
  private workingDirectory: string = '';

  constructor() {
    this.server = new Server(
      {
        name: 'flux-replicate-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.replicateClient = new ReplicateClient();
    this.imageProcessor = new ImageProcessor();
    this.tempManager = new TempManager();

    this.setupHandlers();
  }

  /**
   * Set up MCP request handlers
   */
  private setupHandlers = (): void => {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'generate_image',
            description: 'Generate images using Flux 1 or Flux 2 series models via Replicate',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Text description of the image to generate',
                },
                model: {
                  type: 'string',
                  enum: ['flux-1.1-pro', 'flux-pro', 'flux-schnell', 'flux-ultra', 'flux-2-pro', 'flux-2-max', 'flux-2-flex', 'flux-2-dev', 'flux-2-klein'],
                  description: 'Flux model to use (default: flux-2-pro). Flux 2 series offers improved quality and speed.',
                },
                output_path: {
                  type: 'string',
                  description: 'Output file path (optional). Must be an absolute path if provided. If not provided, auto-generated filename will be used in server working directory.',
                },
                width: {
                  type: 'number',
                  description: 'Image width in pixels (default: 1024)',
                },
                height: {
                  type: 'number',
                  description: 'Image height in pixels (default: 768)',
                },
                quality: {
                  type: 'number',
                  minimum: 1,
                  maximum: 100,
                  description: 'Image quality for lossy formats (default: 80)',
                },
                return_inline_image: {
                  type: 'boolean',
                  description: 'Return the generated image inline as base64 in the response. Only set to true if your client can render images (e.g. a chat UI with image support). Leave false for text-only terminals, CI pipelines, or agent-to-agent workflows where inline images waste tokens. The image is always saved to disk regardless.',
                },
              },
              required: ['prompt'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'generate_image') {
        try {
          return await this.handleGenerateImage(args);
        } catch (err) {
          const mcpError = err instanceof McpError ? err : processingError('Unknown error occurred');
          error('Image generation failed', { error: mcpError.message, args });
          
          return {
            content: [
              {
                type: 'text',
                text: `Error: ${mcpError.message}`,
              },
            ],
            isError: true,
          };
        }
      }

      throw validationError(`Unknown tool: ${name}`);
    });
  };

  /**
   * Generate a filename based on prompt and timestamp
   */
  private generateFilename = (prompt: string, format: string): string => {
    // Clean prompt for filename (remove special characters, limit length)
    const cleanPrompt = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    return `${cleanPrompt}_${timestamp}.${format}`;
  };

  /**
   * Resolve output path to working directory
   */
  private resolveOutputPath = (outputPath: string | undefined, prompt: string, defaultFormat: string): string => {
    // If output_path is provided, it must be an absolute path
    if (outputPath) {
      if (!isAbsolute(outputPath)) {
        throw validationError('output_path must be an absolute path. Relative paths are not supported because the client and server may run in different environments.');
      }
      return outputPath;
    }

    // Auto-generate filename in working directory
    const filename = this.generateFilename(prompt, defaultFormat);
    return join(this.workingDirectory, filename);
  };

  /**
   * Handle image generation request
   */
  private handleGenerateImage = async (args: any): Promise<any> => {
    // Validate required parameters
    if (!args.prompt || typeof args.prompt !== 'string' || args.prompt.trim().length === 0) {
      throw validationError('Prompt is required and must be a non-empty string');
    }

    const prompt = args.prompt.trim();
    const config = getConfig();
    
    // Resolve output path using simplified logic
    const resolvedOutputPath = this.resolveOutputPath(
      args.output_path, 
      prompt,
      config.outputFormat
    );
    
    // Ensure we have a valid model string
    const modelParam: string = args.model || config.defaultModel;
    const width = args.width || 1024;
    const height = args.height || 768;
    const quality = args.quality || config.outputQuality;

    // Validate and ensure model is supported
    if (!this.replicateClient.isModelSupported(modelParam)) {
      throw validationError(`Unsupported model: ${modelParam}. Supported models: ${this.replicateClient.getAvailableModels().join(', ')}`);
    }

    // Now we know model is a valid FluxModel
    const model = modelParam;

    try {
      // Generate image
      const result = await this.replicateClient.generateImage({
        prompt,
        model,
        width,
        height,
      });

      if (result.imageUrls.length === 0) {
        throw processingError('No images were generated');
      }

      // Download the first image
      const imageUrl = result.imageUrls[0];
      if (!imageUrl) {
        throw processingError('No valid image URL returned');
      }
      
      const imageBuffer = await this.replicateClient.downloadImage(imageUrl);

      // Ensure output directory exists
      const outputDir = dirname(resolvedOutputPath);
      await fs.mkdir(outputDir, { recursive: true });

      // Process and save the image - use resolved width/height, not args
      const processResult = await this.imageProcessor.processImage(imageBuffer, {
        outputPath: resolvedOutputPath,
        quality,
        width,
        height,
      });

      // Calculate cost
      const cost = calculateCost(model);

      const content: any[] = [];

      const inlineImage = typeof args.return_inline_image === 'boolean' ? args.return_inline_image : config.inlineImages;

      if (inlineImage) {
        const savedImage = await fs.readFile(processResult.outputPath);
        const mimeType = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[processResult.format] || 'image/jpeg';
        content.push({
          type: 'image',
          data: savedImage.toString('base64'),
          mimeType,
        });
      }

      content.push({
        type: 'text',
        text: `Image generated successfully!\n\nOutput: ${processResult.outputPath}\nModel: ${model}\nDimensions: ${processResult.width}x${processResult.height}\nFile size: ${Math.round(processResult.fileSize / 1024)}KB\nProcessing time: ${result.processingTime}ms\nCost: $${cost.toFixed(3)}\nWorking Directory: ${this.workingDirectory}`,
      });

      return { content };

    } catch (err) {
      // Clean up any temp files
      await this.tempManager.cleanupAll();
      throw err;
    }
  };

  /**
   * Start the MCP server
   */
  start = async (): Promise<void> => {
    try {
      // Validate configuration
      const config = getConfig();
      
      // Initialize working directory
      this.workingDirectory = await ensureWorkingDirectory(config.workingDirectory);
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
    } catch (err) {
      error('Failed to start server', { error: err instanceof Error ? err.message : 'Unknown error' });
      process.exit(1);
    }
  };

  /**
   * Shutdown the server
   */
  shutdown = async (): Promise<void> => {
    await this.tempManager.cleanupAll();
    await this.server.close();
  };
}

/**
 * Main entry point
 */
const main = async (): Promise<void> => {
  const server = new FluxMcpServer();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await server.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.shutdown();
    process.exit(0);
  });

  await server.start();
};

// Start the server
main().catch((err) => {
  error('Server crashed', { error: err instanceof Error ? err.message : 'Unknown error' });
  process.exit(1);
}); 
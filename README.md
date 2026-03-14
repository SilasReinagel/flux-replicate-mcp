# Flux Replicate MCP Server

![Generated with Flux 2 Pro via this MCP server](examples/hero.webp)

A **simple** Model Context Protocol (MCP) server for generating images using Flux models via the Replicate API.

## ✨ Simplicity First

This server has been designed with simplicity as the primary goal:
- **Minimal setup** - Just add your API key and start generating images
- **Zero configuration** - Works out of the box with sensible defaults
- **Platform-aware** - Automatically organizes your images in the right place
- **Essential features only** - Image generation that just works, without complexity
- **Easy integration** - Drop into any MCP client with a single command

## 🚀 Quick Start

### Global Installation (Recommended)

The easiest way to get started is with `npx` or `bunx` - no installation required!

```bash
# Set your Replicate API token
export REPLICATE_API_TOKEN="r8_your_token_here"

# Run with npx (Node.js)
npx flux-replicate-mcp

# OR run with bunx (Bun)
bunx flux-replicate-mcp
```

### CLI Arguments

The server supports comprehensive CLI configuration:

```bash
# Basic usage with API key
flux-replicate-mcp --api-key r8_your_token_here

# Full configuration example
flux-replicate-mcp \
  --api-key r8_your_token_here \
  --model flux-1.1-pro \
  --format jpg \
  --quality 95 \
  --working-directory ~/MyImages

# Get help
flux-replicate-mcp --help
```

**Available CLI Arguments:**
- `--api-key/-k/--replicate-api-key`: Replicate API token (required)
- `--model/-m`: Default model (`flux-2-pro`, `flux-2-max`, `flux-2-flex`, `flux-2-dev`, `flux-2-klein`, `flux-1.1-pro`, `flux-pro`, `flux-schnell`, `flux-ultra`)
- `--format/-f`: Output format (`jpg`, `png`, `webp`)
- `--quality/-q`: Quality setting (1-100)
- `--working-directory/-d/--dir`: Custom working directory
- `--help/-h`: Show help message

📖 **[Complete Installation Guide →](INSTALLATION.md)**

### Local Development

1. **Install Dependencies**
```bash
bun install
```

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env and add your REPLICATE_API_TOKEN
```

3. **Build and Run**
```bash
bun run build
bun run start
```

The server will automatically create a platform-specific working directory for your generated images:
- **Windows**: `%USERPROFILE%\Documents\FluxImages`
- **macOS**: `~/Pictures/FluxImages`
- **Linux**: `~/Pictures/FluxImages` (fallback: `~/flux-images`)

## 🔧 Configuration

All configuration is done via environment variables or CLI arguments:

| Variable | CLI Argument | Required | Default | Description |
|----------|--------------|----------|---------|-------------|
| `REPLICATE_API_TOKEN` | `--api-key` | ✅ | - | Your Replicate API token |
| `FLUX_DEFAULT_MODEL` | `--model` | ❌ | `flux-2-pro` | Default model |
| `FLUX_OUTPUT_FORMAT` | `--format` | ❌ | `jpg` | Default output format |
| `FLUX_OUTPUT_QUALITY` | `--quality` | ❌ | `80` | Default quality for lossy formats (1-100) |
| `FLUX_WORKING_DIRECTORY` | `--working-directory` | ❌ | Platform-specific | Custom working directory |

## 🎨 Supported Models

### Flux 2 Series (Recommended)

| Model | Cost per Image | Speed | Quality | Best For |
|-------|----------------|-------|---------|----------|
| `flux-2-pro` | $0.030 | Medium | Highest | Professional work, detailed images (default) |
| `flux-2-max` | $0.080 | Slow | Ultra High | Premium quality, final outputs |
| `flux-2-flex` | $0.060 | Medium | High | Flexible, general purpose |
| `flux-2-dev` | $0.012 | Fast | Good | Development, experimentation |
| `flux-2-klein` | $0.003 | Fast | Good | Quick iterations, budget-friendly |

### Flux 1 Series

| Model | Cost per Image | Speed | Quality | Best For |
|-------|----------------|-------|---------|----------|
| `flux-1.1-pro` | $0.040 | Medium | Highest | Professional work, detailed images |
| `flux-pro` | $0.040 | Medium | High | General purpose, balanced quality |
| `flux-schnell` | $0.003 | Fast | Good | Quick iterations, testing |
| `flux-ultra` | $0.060 | Slow | Ultra High | Premium quality, final outputs |

## 🛠️ Available Tools

### `generate_image`

Generate images using Flux models with cost tracking.

**Parameters:**
- `prompt` (required): Text description of the image to generate
- `output_path` (optional): Absolute file path for the generated image. If not provided, auto-generated filename will be used in server working directory.
- `model` (optional): Flux model to use (default: `flux-2-pro`)
- `width` (optional): Image width in pixels (default: 1024)
- `height` (optional): Image height in pixels (default: 768)
- `quality` (optional): Image quality for lossy formats (1-100, default: 80)

**Examples:**

**Auto-generated filename with cost tracking:**
```json
{
  "prompt": "A serene mountain landscape at sunset"
}
```
*Response includes: file path, generation time, model used, and cost ($0.040 for flux-1.1-pro)*

**Custom absolute path:**
```json
{
  "prompt": "Professional product photo of a smartphone",
  "output_path": "/absolute/path/to/smartphone.png",
  "model": "flux-pro",
  "width": 1024,
  "height": 1024,
  "quality": 95
}
```

**Fast iteration with flux-schnell:**
```json
{
  "prompt": "Quick concept art of a robot",
  "model": "flux-schnell",
  "output_path": "/home/user/images/robot_concept.jpg"
}
```
*Only $0.003 per image - perfect for rapid prototyping*

**Output Organization:**
- **Auto-generated**: Files saved with descriptive names based on prompt and timestamp in server working directory
- **Custom path**: `output_path` must be an absolute path for the generated image
- **Path validation**: Relative paths are rejected to ensure compatibility across client/server environments
- **Directory creation**: Output directories are automatically created if they don't exist
- **Cost tracking**: Every generation shows the cost and model used

## 🎯 Design Philosophy

This server follows the principle: **"Simple enough to understand in 30 minutes, powerful enough to generate great images"**

### What's Included
- ✅ Core image generation with Core Flux models
- ✅ Image processing and format conversion
- ✅ Platform-specific working directories
- ✅ CLI argument support with comprehensive help
- ✅ Cost tracking for budget awareness
- ✅ Basic error handling and logging
- ✅ MCP protocol compliance

## 🔗 MCP Integration

### Claude Desktop (Recommended)

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "flux-replicate": {
      "command": "npx",
      "args": ["flux-replicate-mcp"],
      "env": {
        "REPLICATE_API_TOKEN": "your_token_here"
      }
    }
  }
}
```

### Cursor Integration

#### Method 1: Using mcp.json

Create or edit `.cursor/mcp.json` in your project directory:

```json
{
  "mcpServers": {
    "flux-replicate": {
      "command": "env REPLICATE_API_TOKEN=YOUR_TOKEN npx",
      "args": ["-y", "flux-replicate-mcp"]
    }
  }
}
```

#### Method 2: Manual Configuration

1. Open Cursor Settings → MCP section
2. Add server with command: `env REPLICATE_API_TOKEN=YOUR_TOKEN npx -y flux-replicate-mcp`
3. Restart Cursor

### Other MCP Clients

The server works with any MCP-compatible client:
- **Cline**: Use the same npx command
- **Zed**: Add to MCP configuration
- **Custom clients**: Use the MCP SDK

📖 **[Complete Integration Guide →](INSTALLATION.md)**

## 🚨 Error Handling

The server uses simple error codes with helpful messages:
- `AUTH`: Authentication/API key issues
- `API`: Replicate API errors  
- `VALIDATION`: Invalid input parameters
- `PROCESSING`: Image processing failures

All errors are logged as structured JSON to stderr for MCP compatibility.

## 💰 Cost Management

Track your spending with built-in cost reporting:
- Each generation shows the exact cost
- Model pricing clearly displayed
- Choose models based on budget vs quality needs
- Use `flux-2-klein` for cheap iterations ($0.003)
- Use `flux-2-max` for premium results ($0.080)

## 📦 Installation & Usage

### Global Installation
```bash
# Install globally
npm install -g flux-replicate-mcp

# Or use directly with npx
npx flux-replicate-mcp --api-key YOUR_TOKEN

# Or use with bunx
bunx flux-replicate-mcp --api-key YOUR_TOKEN
```

### Package Information
- **Package Name**: `flux-replicate-mcp`
- **Binaries**: `flux-replicate-mcp`, `flux-replicate-mcp-server`
- **Dependencies**: 3 runtime dependencies
- **Size**: ~600KB unpacked

## 📝 Development

### Build
```bash
bun run build
```

### Development Mode
```bash
bun run dev
```

### Publish to npm
```bash
# Build and publish
bun run build
npm publish
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

- 📖 [Installation Guide](INSTALLATION.md)
- 🐛 [Report Issues](https://github.com/SilasReinagel/flux-replicate-mcp/issues)
- 📦 [npm Package](https://www.npmjs.com/package/flux-replicate-mcp)

## 📄 License

MIT

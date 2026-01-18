# Image Generation MCP Server

An MCP (Model Context Protocol) server that provides image generation and validation capabilities using OpenAI's DALL-E 3 and GPT-4 Vision APIs.

## Features

- 🎨 **Image Generation**: Generate high-quality images from text prompts using DALL-E 3
- 🔍 **Image Validation**: Validate if generated images match the original prompt using GPT-4 Vision
- 📝 **Image Description**: Get detailed descriptions of images using GPT-4 Vision
- ⚙️ **Configurable**: Support for different image sizes, qualities, and styles

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your OpenAI API key:
```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

3. Build the server:
```bash
npm run build
```

## Usage

### Running the Server

```bash
npm start
```

Or in development mode:
```bash
npm run dev
```

### Available Tools

#### 1. `generate_image`

Generate an image from a text prompt.

**Parameters:**
- `prompt` (required): Text description of the image to generate
- `size` (optional): Image size - "1024x1024", "1792x1024", or "1024x1792" (default: "1024x1024")
- `quality` (optional): Image quality - "standard" or "hd" (default: "standard")
- `style` (optional): Image style - "vivid" or "natural" (default: "vivid")

**Returns:**
```json
{
  "success": true,
  "image_url": "https://...",
  "revised_prompt": "...",
  "size": "1024x1024",
  "quality": "standard",
  "style": "vivid",
  "original_prompt": "..."
}
```

**Example:**
```json
{
  "prompt": "A red apple on a wooden table with dramatic lighting",
  "size": "1024x1024",
  "quality": "standard",
  "style": "vivid"
}
```

#### 2. `validate_image`

Validate if a generated image matches the original prompt.

**Parameters:**
- `image_url` (required): URL of the image to validate
- `original_prompt` (required): The original prompt used to generate the image

**Returns:**
```json
{
  "matches_prompt": true,
  "confidence": 95,
  "description": "detailed description of what is seen in the image",
  "quality_score": 9,
  "strengths": ["accurate color representation", "good lighting"],
  "issues": ["minor blur in background"],
  "suggestions": ["could use more dramatic shadows"]
}
```

**Example:**
```json
{
  "image_url": "https://...",
  "original_prompt": "A red apple on a wooden table"
}
```

#### 3. `describe_image`

Get a detailed description of an image.

**Parameters:**
- `image_url` (required): URL of the image to describe

**Returns:**
A detailed text description of the image including objects, colors, composition, style, and mood.

**Example:**
```json
{
  "image_url": "https://..."
}
```

## Testing

Run the test suite to verify functionality:

```bash
npm test
```

The test suite will:
1. Generate images with various prompts
2. Validate generated images against their prompts
3. Describe image content
4. Test different image sizes

**Note:** Testing requires a valid OpenAI API key and will incur API costs.

## Configuration

### Environment Variables

- `OPENAI_API_KEY` (required): Your OpenAI API key

### MCP Client Configuration

To use this server with an MCP client, add it to your MCP settings:

```json
{
  "mcpServers": {
    "image-generation": {
      "command": "node",
      "args": [
        "/path/to/mcp-servers/image-generation/build/index.js"
      ],
      "env": {
        "OPENAI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## API Costs

This server uses OpenAI's APIs which incur costs:

**DALL-E 3:**
- Standard 1024×1024: $0.040 per image
- Standard 1024×1792 or 1792×1024: $0.080 per image
- HD 1024×1792 or 1792×1024: $0.120 per image

**GPT-4 Vision (for validation):**
- Varies based on token usage and image resolution

See [OpenAI Pricing](https://openai.com/pricing) for current rates.

## How It Works

### Image Generation Flow

1. Client sends a prompt to `generate_image` tool
2. Server validates the prompt
3. Server calls DALL-E 3 API with specified parameters
4. DALL-E 3 generates the image and returns a temporary URL (valid for 1 hour)
5. Server returns the image URL and revised prompt to client

### Image Validation Flow

1. Client sends an image URL and original prompt to `validate_image` tool
2. Server calls GPT-4 Vision API with the image and validation instructions
3. GPT-4 Vision analyzes the image and compares it to the prompt
4. Server returns validation results including match status, confidence, quality score, and suggestions

### Image Description Flow

1. Client sends an image URL to `describe_image` tool
2. Server calls GPT-4 Vision API with the image
3. GPT-4 Vision provides a detailed description
4. Server returns the description to client

## Architecture

```
┌─────────────────┐
│   MCP Client    │
│  (Copilot, etc) │
└────────┬────────┘
         │
         │ MCP Protocol (stdio)
         │
┌────────▼────────────────────────────────────┐
│         Image Generation MCP Server          │
│                                              │
│  ┌──────────────┐  ┌──────────────┐        │
│  │   generate   │  │   validate   │        │
│  │    _image    │  │    _image    │        │
│  └──────┬───────┘  └──────┬───────┘        │
│         │                 │                 │
│         │  ┌──────────────┴──────┐         │
│         │  │    describe_image   │         │
│         │  └──────────┬──────────┘         │
└─────────┼─────────────┼─────────────────────┘
          │             │
          │             │ OpenAI API
          │             │
┌─────────▼─────────────▼─────────────────────┐
│            OpenAI Services                   │
│  ┌──────────────┐  ┌──────────────┐        │
│  │   DALL-E 3   │  │ GPT-4 Vision │        │
│  └──────────────┘  └──────────────┘        │
└──────────────────────────────────────────────┘
```

## Security Considerations

1. **API Key Protection**: Store your API key in environment variables, never commit it to version control
2. **Rate Limiting**: OpenAI has rate limits based on your tier; implement appropriate request throttling
3. **Content Policy**: DALL-E 3 has built-in content filtering for safety
4. **Error Handling**: All API errors are caught and returned gracefully
5. **Cost Management**: Monitor your OpenAI usage to prevent unexpected costs

## Troubleshooting

### Server won't start

- Verify `OPENAI_API_KEY` is set in your environment
- Check that all dependencies are installed (`npm install`)
- Ensure the build is up to date (`npm run build`)

### API errors

- Check your OpenAI API key is valid
- Verify you have sufficient API credits
- Check rate limits (may need to wait before retrying)
- Review OpenAI's content policy if prompts are rejected

### Image URLs expire

- DALL-E 3 image URLs are temporary (valid for 1 hour)
- Download and save images locally if you need them longer
- Consider implementing a caching layer

## Development

### Project Structure

```
image-generation/
├── src/
│   ├── index.ts      # Main MCP server implementation
│   └── test.ts       # Test suite
├── build/            # Compiled JavaScript (generated)
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
├── .env.example      # Example environment variables
└── README.md         # This file
```

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

## License

ISC

## Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [DALL-E 3 Guide](https://platform.openai.com/docs/guides/images)
- [GPT-4 Vision](https://platform.openai.com/docs/guides/vision)
- [Model Context Protocol](https://modelcontextprotocol.io/)

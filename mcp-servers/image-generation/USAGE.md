# Image Generation MCP Server - Usage Guide

## Quick Start

### 1. Setup

```bash
cd mcp-servers/image-generation
npm install
npm run build
```

### 2. Configure API Key

```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### 3. Test the Server

```bash
# Dry-run test (no API calls)
npm run test:dry-run

# Full test with API calls (requires OPENAI_API_KEY)
npm test
```

### 4. Start the Server

```bash
npm start
```

## Using with GitHub Copilot

Add this configuration to your MCP settings file:

**For VS Code** (`~/.vscode/mcp-settings.json` or workspace settings):
```json
{
  "mcpServers": {
    "image-generation": {
      "command": "node",
      "args": [
        "/absolute/path/to/AiAssist/mcp-servers/image-generation/build/index.js"
      ],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

**For Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
```json
{
  "mcpServers": {
    "image-generation": {
      "command": "node",
      "args": [
        "/absolute/path/to/AiAssist/mcp-servers/image-generation/build/index.js"
      ],
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

## Example Usage

### Generate a Simple Image

```
Prompt to Copilot:
"Use the image generation MCP server to create an image of a red apple on a wooden table with dramatic lighting"

Expected Response:
- Image URL (valid for 1 hour)
- Revised prompt showing how DALL-E interpreted your request
- Image size, quality, and style information
```

### Generate with Custom Parameters

```
Prompt to Copilot:
"Generate a high-quality HD image of a futuristic cityscape at sunset in 1792x1024 size with natural style"

Parameters:
- size: "1792x1024"
- quality: "hd"
- style: "natural"
```

### Validate Generated Image

```
Prompt to Copilot:
"Validate this image [URL] against the prompt 'a red apple on a wooden table'"

Expected Response:
- Whether the image matches the prompt (true/false)
- Confidence score (0-100)
- Detailed description of the image
- Quality score (0-10)
- Strengths and weaknesses
- Suggestions for improvement
```

### Describe an Image

```
Prompt to Copilot:
"Describe this image: [URL]"

Expected Response:
- Detailed description including:
  - Objects present
  - Colors and lighting
  - Composition and layout
  - Style and artistic elements
  - Mood and atmosphere
```

## Common Use Cases

### 1. Creating Marketing Materials

```
Steps:
1. Generate: "A modern tech startup office with diverse team collaborating"
2. Validate: Check if the image matches your brand requirements
3. Iterate: Refine prompt based on validation feedback
```

### 2. Concept Visualization

```
Steps:
1. Generate: "A mobile app interface showing a health tracking dashboard"
2. Describe: Get detailed analysis of the generated design
3. Generate variations with refined prompts
```

### 3. Content Creation

```
Steps:
1. Generate multiple images with variations
2. Validate each against your content requirements
3. Select the best match based on validation scores
```

### 4. Quality Assurance Workflow

```
Steps:
1. Generate image from prompt
2. Use validate_image to check:
   - Prompt adherence
   - Technical quality
   - Any issues or problems
3. Iterate until quality score is satisfactory (8+/10)
```

## Tool Reference

### generate_image

**Purpose**: Create images from text descriptions

**Parameters**:
- `prompt` (required): Text description of desired image
- `size` (optional): "1024x1024" (default), "1792x1024", or "1024x1792"
- `quality` (optional): "standard" (default) or "hd"
- `style` (optional): "vivid" (default) or "natural"

**Returns**:
```json
{
  "success": true,
  "image_url": "https://...",
  "revised_prompt": "Enhanced version of your prompt",
  "size": "1024x1024",
  "quality": "standard",
  "style": "vivid",
  "original_prompt": "Your original prompt"
}
```

**Cost**: $0.040 - $0.120 per image (depending on size/quality)

### validate_image

**Purpose**: Assess if image matches prompt and evaluate quality

**Parameters**:
- `image_url` (required): URL of the image to validate
- `original_prompt` (required): The prompt used to generate the image

**Returns**:
```json
{
  "matches_prompt": true,
  "confidence": 95,
  "description": "The image shows...",
  "quality_score": 9,
  "strengths": ["Excellent lighting", "Accurate colors"],
  "issues": ["Slight blur in background"],
  "suggestions": ["Add more contrast"]
}
```

**Cost**: ~$0.01 per validation (GPT-4 Vision)

### describe_image

**Purpose**: Get detailed description of image content

**Parameters**:
- `image_url` (required): URL of the image to describe

**Returns**: Detailed text description

**Cost**: ~$0.005 per description (GPT-4 Vision)

## Best Practices

### Prompt Writing

**Good Prompts**:
- Specific and detailed: "A red fuji apple on an oak wooden table with dramatic side lighting casting shadows"
- Include style: "...in photorealistic style" or "...as a watercolor painting"
- Specify mood: "...with warm, cozy atmosphere"

**Avoid**:
- Too vague: "an apple"
- Contradictory: "dark bright room"
- Impossible: "a square circle"

### Cost Management

1. **Use standard quality** for testing and iteration
2. **Use HD quality** only for final production images
3. **Choose appropriate size**:
   - 1024x1024 for square/profile images
   - 1792x1024 for landscape/banner images
   - 1024x1792 for portrait/vertical images

### Quality Assurance

1. Always validate important images before use
2. Check quality_score - aim for 8+/10
3. Review "issues" array for problems
4. Use "suggestions" to improve prompts

### Iteration Strategy

1. Start with a basic prompt
2. Generate and validate
3. Review revised_prompt to understand DALL-E's interpretation
4. Refine based on validation feedback
5. Repeat until quality_score is satisfactory

## Troubleshooting

### "Error: OPENAI_API_KEY environment variable is not set"

**Solution**: 
- Add your API key to `.env` file
- Or set environment variable: `export OPENAI_API_KEY=sk-...`

### "Rate limit exceeded"

**Solution**:
- Wait a few minutes before retrying
- Check your OpenAI account tier and rate limits
- Consider upgrading your OpenAI account

### "Image URL expired"

**Issue**: DALL-E image URLs are temporary (1 hour)

**Solution**:
- Download images immediately after generation
- Save locally if needed for longer term use
- Consider implementing a storage solution

### "Content policy violation"

**Issue**: Prompt violates OpenAI's content policy

**Solution**:
- Review [OpenAI's usage policies](https://openai.com/policies/usage-policies)
- Rephrase your prompt
- Avoid requesting prohibited content

### "Failed to validate image"

**Possible causes**:
- Invalid or expired image URL
- Network connectivity issues
- GPT-4 Vision API issues

**Solution**:
- Verify the image URL is accessible
- Check your internet connection
- Retry after a short delay

## Performance Tips

### Response Times

- Image generation: 10-30 seconds
- Image validation: 5-15 seconds
- Image description: 5-10 seconds

### Parallel Processing

You can generate multiple images in parallel by:
1. Using different prompts
2. Running multiple instances
3. Processing in batches

### Caching

Consider implementing caching for:
- Repeated prompts
- Validation results
- Image descriptions

## Cost Estimation

### Example Workflows

**Basic Usage** (10 images/day):
- Generation: 10 × $0.04 = $0.40/day
- Validation: 10 × $0.01 = $0.10/day
- Total: ~$15/month

**Heavy Usage** (100 images/day):
- Generation: 100 × $0.04 = $4.00/day
- Validation: 100 × $0.01 = $1.00/day
- Total: ~$150/month

**HD Production** (20 HD images/day):
- Generation: 20 × $0.12 = $2.40/day
- Validation: 20 × $0.01 = $0.20/day
- Total: ~$78/month

## Integration Examples

### With Other MCP Servers

Combine with:
- **File system MCP**: Save generated images locally
- **GitHub MCP**: Upload images to repositories
- **Web search MCP**: Find reference images for prompts

### Workflow Automation

```
Example: Automated blog post illustrations
1. Extract key topics from blog post
2. Generate image for each topic
3. Validate each image
4. Save images with quality score > 8
5. Insert best images into blog post
```

## Security Notes

1. **Never commit API keys**: Use environment variables
2. **Rate limiting**: Implement request throttling
3. **Content filtering**: DALL-E has built-in safety measures
4. **Cost monitoring**: Set up billing alerts in OpenAI dashboard
5. **Access control**: Restrict who can use the server

## Support and Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [DALL-E 3 Guide](https://platform.openai.com/docs/guides/images)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Project README](./README.md)
- [API Research Document](../image-generation-api-research.md)

# Minecraft Bedrock Realm Addons

This directory contains Minecraft Bedrock addons, packs, and worlds that can be automatically deployed to your Minecraft Realm using GitHub Actions.

## Directory Structure

```
minecraft-addons/
├── *.mcworld              # World files (automatically detected)
├── *.mcaddon              # Complete addon packages (automatically detected)
├── resource-packs/        # Resource packs directory
│   └── *.mcpack          # Resource pack files
└── behavior-packs/        # Behavior packs directory
    └── *.mcpack          # Behavior pack files
```

## Setup

### 1. Configure GitHub Secrets

You need to add your Microsoft/Minecraft account credentials as GitHub secrets:

1. Go to your repository settings
2. Navigate to **Secrets and variables** → **Actions**
3. Add the following secrets:
   - `MINECRAFT_USERNAME`: Your Microsoft account email
   - `MINECRAFT_PASSWORD`: Your Microsoft account password

> **Security Note**: These credentials are stored securely by GitHub and are never exposed in logs or outputs.

### 2. Configure Your Realm Name

Edit `.github/workflows/minecraft-realm-deploy.yml` and set the `DEFAULT_REALM_NAME` environment variable to match your Minecraft Realm's name:

```yaml
env:
  DEFAULT_REALM_NAME: "My Realm"  # Change this to your realm name
```

## Usage

### Automatic Deployment

The workflow automatically triggers when you:

1. Push changes to the `main` branch that affect files in `minecraft-addons/` directory
2. The workflow will automatically detect and deploy:
   - Any `.mcworld` files in the root
   - Any `.mcaddon` files in the root
   - Any `.mcpack` files in `resource-packs/` directory
   - Any `.mcpack` files in `behavior-packs/` directory

### Manual Deployment

You can also manually trigger the deployment:

1. Go to **Actions** tab in your repository
2. Select **Deploy Minecraft Bedrock Realm Addons** workflow
3. Click **Run workflow**
4. Fill in the parameters:
   - **Realm name**: Name of your Minecraft Realm
   - **World file**: Path to `.mcworld` file (optional)
   - **Resource pack**: Path to resource pack `.mcpack` (optional)
   - **Behavior pack**: Path to behavior pack `.mcpack` (optional)
   - **Addon**: Path to `.mcaddon` file (optional)

## File Types

### .mcworld
Complete world files that replace the current world in your realm.

### .mcaddon
Complete addon packages containing both resource and behavior packs.

### .mcpack (Resource Pack)
Visual enhancements like textures, sounds, and models. Place in `resource-packs/` directory.

### .mcpack (Behavior Pack)
Game logic, entities, items, and mechanics. Place in `behavior-packs/` directory.

## Example: Adding a New Addon

1. Create or obtain your addon files
2. Add them to the appropriate directories:
   ```bash
   # For a complete addon
   cp my-addon.mcaddon minecraft-addons/
   
   # Or for separate packs
   cp my-resource-pack.mcpack minecraft-addons/resource-packs/
   cp my-behavior-pack.mcpack minecraft-addons/behavior-packs/
   
   # For a world file
   cp my-world.mcworld minecraft-addons/
   ```
3. Commit and push:
   ```bash
   git add minecraft-addons/
   git commit -m "Add new Minecraft addon"
   git push
   ```
4. The GitHub Action will automatically deploy to your realm

## Troubleshooting

### Authentication Issues

If authentication fails:
- Verify your `MINECRAFT_USERNAME` and `MINECRAFT_PASSWORD` secrets are correct
- Make sure you don't have 2FA enabled on your Microsoft account (or use app-specific password)
- Check that your account has access to the realm

### Realm Not Found

If the workflow can't find your realm:
- Verify the realm name matches exactly (case-sensitive)
- Ensure your account is the owner or has admin access to the realm
- Check that the realm is active and not expired

### Upload Failures

If file uploads fail:
- Verify the file format is correct (`.mcworld`, `.mcpack`, `.mcaddon`)
- Check that files are not corrupted
- Ensure files are not too large (realm limits apply)

## API Documentation

The automation uses the Minecraft Bedrock Realms API. For more details, see:
- `scripts/minecraft/auth.py` - Authentication handling
- `scripts/minecraft/realm_api.py` - Realm API interactions

## Limitations

- Requires realm owner or admin access
- File size limits apply per Minecraft Realm restrictions
- **Authentication uses simplified flow**: The current implementation includes a placeholder for Microsoft OAuth authentication. For production use, you need to implement one of the following:
  - Device code flow with token caching
  - Refresh token flow with pre-generated tokens
  - Service principal authentication for enterprise scenarios
  - See `scripts/minecraft/auth.py` for detailed implementation guidance
- Some realm features may require additional API endpoints

## Important Authentication Note

⚠️ The authentication module (`scripts/minecraft/auth.py`) currently contains a placeholder implementation for Microsoft OAuth. To make this fully functional in production:

1. **For Personal Use**: Implement the Device Code Flow
   - User authenticates once via browser
   - Token is cached and refreshed automatically
   - Best for personal automation

2. **For Automation**: Use Refresh Tokens
   - Generate refresh token once manually
   - Store as GitHub secret
   - Use refresh token to obtain access tokens
   - More reliable for CI/CD

3. **For Enterprise**: Use Service Principal
   - Create Azure AD application
   - Use client credentials flow
   - Best for organizational use

See the function documentation in `auth.py` for detailed implementation guidance.

## Security Considerations

- Never commit credentials directly to the repository
- Always use GitHub Secrets for sensitive information
- Regularly rotate your passwords
- Review workflow runs for any exposed information
- Consider using a dedicated account for automation

## Contributing

If you encounter issues or have improvements:
1. Check existing issues in the repository
2. Create a detailed bug report or feature request
3. Submit pull requests with improvements

## License

This automation script is provided as-is for personal and educational use.

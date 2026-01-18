# Minecraft Bedrock Realm Automation Guide

This guide explains how to use the automated deployment system for Minecraft Bedrock Realm addons, packs, and worlds.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setup Instructions](#setup-instructions)
4. [Usage](#usage)
5. [Technical Details](#technical-details)
6. [Troubleshooting](#troubleshooting)
7. [Security Best Practices](#security-best-practices)

## Overview

The Minecraft Bedrock Realm automation system allows you to:

- **Authenticate** with your Microsoft/Minecraft account securely
- **Upload** world files (`.mcworld`) to your realm
- **Deploy** behavior packs (`.mcpack`) for game logic modifications
- **Deploy** resource packs (`.mcpack`) for visual enhancements
- **Deploy** complete addons (`.mcaddon`) containing both pack types

All of this happens automatically through GitHub Actions whenever you push changes to the `minecraft-addons/` directory.

## Prerequisites

### Required

1. **Minecraft Bedrock Realm subscription**
   - Active realm with owner or admin access
   - Know your realm's exact name

2. **Microsoft/Minecraft Account**
   - Account with access to the realm
   - Username (email) and password
   - 2FA should be disabled or use app-specific password

3. **GitHub Repository**
   - This repository cloned or forked
   - Access to repository settings (to add secrets)

### Optional

- Minecraft addon development knowledge
- Basic understanding of GitHub Actions

## Setup Instructions

### Step 1: Configure GitHub Secrets

Your Microsoft account credentials must be stored securely:

1. Navigate to your repository on GitHub
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these two secrets:

   **Secret 1:**
   - Name: `MINECRAFT_USERNAME`
   - Value: Your Microsoft account email (e.g., `user@example.com`)

   **Secret 2:**
   - Name: `MINECRAFT_PASSWORD`
   - Value: Your Microsoft account password

   > 🔒 **Security**: These secrets are encrypted and never exposed in logs.

### Step 2: Configure Realm Name

Edit the workflow file to set your realm name:

1. Open `.github/workflows/minecraft-realm-deploy.yml`
2. Find the `env` section near the top:
   ```yaml
   env:
     DEFAULT_REALM_NAME: "My Realm"
   ```
3. Change `"My Realm"` to your actual realm name (must match exactly, case-sensitive)
4. Commit and push this change

### Step 3: Verify Setup

Test the authentication by manually running the workflow:

1. Go to **Actions** tab in your repository
2. Select **Deploy Minecraft Bedrock Realm Addons**
3. Click **Run workflow**
4. Enter your realm name
5. Leave file paths empty
6. Click **Run workflow**

If authentication succeeds, you're all set! If it fails, check the [Troubleshooting](#troubleshooting) section.

## Usage

### Automatic Deployment (Recommended)

The easiest way to deploy addons is to push them to the repository:

1. **Add your addon files** to the `minecraft-addons/` directory:
   ```
   minecraft-addons/
   ├── my-world.mcworld              # World files (root)
   ├── my-complete-addon.mcaddon     # Complete addons (root)
   ├── resource-packs/
   │   └── my-textures.mcpack       # Resource packs here
   └── behavior-packs/
       └── my-gameplay.mcpack       # Behavior packs here
   ```

2. **Commit and push**:
   ```bash
   git add minecraft-addons/
   git commit -m "Add new Minecraft addon"
   git push origin main
   ```

3. **Monitor deployment**:
   - Go to the **Actions** tab
   - Watch the workflow run
   - Check logs if any issues occur

### Manual Deployment

For more control, trigger the workflow manually:

1. Go to **Actions** → **Deploy Minecraft Bedrock Realm Addons**
2. Click **Run workflow**
3. Fill in parameters:
   - **realm_name**: Your realm's name
   - **world_file**: Path like `minecraft-addons/my-world.mcworld`
   - **resource_pack**: Path like `minecraft-addons/resource-packs/pack.mcpack`
   - **behavior_pack**: Path like `minecraft-addons/behavior-packs/pack.mcpack`
   - **addon**: Path like `minecraft-addons/my-addon.mcaddon`
4. Click **Run workflow**

> 💡 **Tip**: You can specify only the files you want to deploy. Leave others empty.

## Technical Details

### Authentication Flow

The system uses a multi-step authentication process:

1. **Microsoft OAuth**: Obtains Microsoft access token
2. **Xbox Live**: Exchanges for Xbox Live token
3. **XSTS**: Gets XSTS token for Minecraft
4. **Minecraft Services**: Final authentication for Realm API

This follows the standard Minecraft authentication flow.

### Realm API Operations

#### Upload World
1. Request upload URL from Realms API
2. Upload `.mcworld` file to provided URL
3. Trigger world restoration on realm

#### Deploy Resource Pack
1. Request resource pack upload URL (slot 1)
2. Upload `.mcpack` file
3. Pack is applied to realm

#### Deploy Behavior Pack
1. Request behavior pack upload URL (slot 2)
2. Upload `.mcpack` file
3. Pack is applied to realm

#### Deploy Addon
1. Extract `.mcaddon` (it's a ZIP file)
2. Identify resource and behavior packs inside
3. Deploy each pack separately using above methods

### File Detection Logic

The workflow automatically detects files:

```bash
# World files: First .mcworld in root
minecraft-addons/*.mcworld

# Addons: First .mcaddon in root
minecraft-addons/*.mcaddon

# Resource packs: First .mcpack in resource-packs/
minecraft-addons/resource-packs/*.mcpack

# Behavior packs: First .mcpack in behavior-packs/
minecraft-addons/behavior-packs/*.mcpack
```

## Troubleshooting

### Authentication Fails

**Symptom**: Workflow fails at authentication step

**Solutions**:
- Verify `MINECRAFT_USERNAME` and `MINECRAFT_PASSWORD` secrets are correct
- Check if 2FA is enabled (disable it or use app-specific password)
- Ensure your Microsoft account is not locked or requires verification
- Try logging into Minecraft manually to verify credentials

### Realm Not Found

**Symptom**: Error message "Realm 'X' not found"

**Solutions**:
- Double-check realm name is exact (case-sensitive)
- Verify your account has owner/admin access to the realm
- Ensure realm is active (not expired)
- List available realms by checking workflow logs

### Upload Failures

**Symptom**: Files fail to upload to realm

**Solutions**:
- Verify file is valid (not corrupted)
- Check file size (realms have size limits)
- Ensure file extension is correct (`.mcworld`, `.mcpack`, `.mcaddon`)
- Try uploading manually through Minecraft to test the file

### Workflow Doesn't Trigger

**Symptom**: Push to `main` doesn't start workflow

**Solutions**:
- Verify changes are in `minecraft-addons/` directory
- Check you pushed to `main` branch
- Look at Actions tab for disabled workflows
- Ensure workflow file syntax is valid (YAML)

### Permission Denied

**Symptom**: API returns permission errors

**Solutions**:
- Confirm you're the realm owner or have admin access
- Check if realm is locked or restricted
- Verify your subscription is active
- Try accessing realm through Minecraft app

## Security Best Practices

### Credentials Management

✅ **DO:**
- Use GitHub Secrets for all credentials
- Rotate passwords regularly
- Use a dedicated account for automation if possible
- Review workflow run logs for any exposed information
- Enable audit logging on your GitHub repository

❌ **DON'T:**
- Commit credentials to the repository
- Share your secrets with others
- Use your main personal account if avoidable
- Disable security features to make automation work

### Access Control

- Limit who can trigger workflows (branch protections)
- Use environment protection rules for sensitive operations
- Enable required reviews for workflow changes
- Monitor who has access to repository secrets

### Monitoring

- Regularly check workflow runs for failures
- Set up notifications for failed runs
- Review deployment history
- Audit changes to workflow files

## Advanced Configuration

### Multiple Realms

To deploy to different realms:

1. Create separate workflow files (copy and rename)
2. Configure each with different `DEFAULT_REALM_NAME`
3. Use path filters to trigger on different directories

### Scheduled Deployments

Add a schedule trigger:

```yaml
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly on Sunday at 2 AM
```

### Deployment Notifications

Add a notification step:

```yaml
- name: Send notification
  if: always()
  uses: some/notification-action@v1
  with:
    status: ${{ job.status }}
```

## API Reference

### Authentication Script

**Location**: `scripts/minecraft/auth.py`

**Environment Variables**:
- `MINECRAFT_USERNAME`: Microsoft account email
- `MINECRAFT_PASSWORD`: Microsoft account password

**Output**: Creates `/tmp/minecraft_tokens.json` with access tokens

**Usage**:
```bash
export MINECRAFT_USERNAME="user@example.com"
export MINECRAFT_PASSWORD="password"
python scripts/minecraft/auth.py
```

### Realm API Script

**Location**: `scripts/minecraft/realm_api.py`

**Arguments**:
- `--realm-name`: Name of the realm (required)
- `--world-file`: Path to `.mcworld` file (optional)
- `--resource-pack`: Path to resource pack `.mcpack` (optional)
- `--behavior-pack`: Path to behavior pack `.mcpack` (optional)
- `--addon`: Path to `.mcaddon` file (optional)
- `--token-file`: Path to tokens file (default: `/tmp/minecraft_tokens.json`)

**Usage**:
```bash
python scripts/minecraft/realm_api.py \
  --realm-name "My Realm" \
  --addon minecraft-addons/my-addon.mcaddon
```

## Contributing

Found a bug or have an improvement?

1. Check existing issues
2. Create a detailed bug report or feature request
3. Submit a pull request with your changes

## Resources

- [Minecraft Bedrock Documentation](https://docs.microsoft.com/minecraft/creator/)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Microsoft Identity Platform](https://docs.microsoft.com/azure/active-directory/develop/)

## Support

For issues specific to this automation:
- Check this guide's troubleshooting section
- Review workflow run logs
- Create an issue in the repository

For Minecraft/Realm issues:
- [Minecraft Support](https://help.minecraft.net/)
- [Minecraft Feedback](https://feedback.minecraft.net/)

---

**Note**: This automation is provided as-is for educational and personal use. Always follow Minecraft's Terms of Service and Microsoft's Acceptable Use Policy.

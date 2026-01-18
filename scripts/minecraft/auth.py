#!/usr/bin/env python3
"""
Minecraft/Microsoft Authentication Module
Handles authentication with Microsoft/Xbox Live to get access tokens for Realm API
"""

import requests
import json
import sys
import os
from typing import Optional, Dict, Any


class MinecraftAuth:
    """Handles authentication flow for Minecraft Bedrock Realms API"""
    
    # Microsoft OAuth endpoints
    MICROSOFT_AUTH_URL = "https://login.live.com/oauth20_authorize.srf"
    MICROSOFT_TOKEN_URL = "https://login.live.com/oauth20_token.srf"
    
    # Xbox Live endpoints
    XBOX_AUTH_URL = "https://user.auth.xboxlive.com/user/authenticate"
    XBOX_XSTS_URL = "https://xsts.auth.xboxlive.com/xsts/authorize"
    
    # Minecraft endpoints
    MINECRAFT_AUTH_URL = "https://api.minecraftservices.com/authentication/login_with_xbox"
    
    # Client ID for Minecraft (publicly known)
    CLIENT_ID = "00000000402b5328"
    SCOPE = "service::user.auth.xboxlive.com::MBI_SSL"
    
    def __init__(self, username: str, password: str):
        """
        Initialize authentication handler
        
        Args:
            username: Microsoft account email
            password: Microsoft account password
        """
        self.username = username
        self.password = password
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
    
    def authenticate(self) -> Optional[Dict[str, Any]]:
        """
        Perform full authentication flow
        
        Returns:
            Dictionary containing access tokens and user info, or None on failure
        """
        try:
            print("Starting authentication flow...")
            
            # Step 1: Get Microsoft access token
            ms_token = self._get_microsoft_token()
            if not ms_token:
                print("Failed to get Microsoft access token")
                return None
            
            print("✓ Microsoft authentication successful")
            
            # Step 2: Authenticate with Xbox Live
            xbox_token = self._authenticate_xbox(ms_token)
            if not xbox_token:
                print("Failed to authenticate with Xbox Live")
                return None
            
            print("✓ Xbox Live authentication successful")
            
            # Step 3: Get XSTS token
            xsts_data = self._get_xsts_token(xbox_token)
            if not xsts_data:
                print("Failed to get XSTS token")
                return None
            
            print("✓ XSTS token obtained")
            
            # Step 4: Authenticate with Minecraft
            mc_token = self._authenticate_minecraft(
                xsts_data['token'],
                xsts_data['uhs']
            )
            if not mc_token:
                print("Failed to authenticate with Minecraft")
                return None
            
            print("✓ Minecraft authentication successful")
            
            return {
                'access_token': mc_token,
                'xsts_token': xsts_data['token'],
                'user_hash': xsts_data['uhs'],
                'microsoft_token': ms_token
            }
            
        except Exception as e:
            print(f"Authentication error: {e}", file=sys.stderr)
            return None
    
    def _get_microsoft_token(self) -> Optional[str]:
        """
        Get Microsoft OAuth access token using device code flow
        
        Note: This is a simplified placeholder implementation.
        In production, you need to implement one of these approaches:
        
        1. Device Code Flow (recommended for automation):
           - Request device code from Microsoft
           - Display code to user (first-time setup)
           - Poll for token approval
           - Cache token for future use
        
        2. Refresh Token Flow (for long-term automation):
           - Obtain initial refresh token (one-time manual setup)
           - Store refresh token securely
           - Use refresh token to get access tokens
        
        3. Service Principal (for enterprise):
           - Create Azure AD application
           - Use client credentials flow
        
        For GitHub Actions automation with stored credentials, consider:
        - Pre-generating tokens and storing them as secrets
        - Using refresh tokens instead of passwords
        - Implementing token refresh logic
        
        Current implementation returns a mock token and will fail in production.
        """
        print("⚠️  WARNING: Using placeholder authentication")
        print("   This implementation requires a proper OAuth flow to work in production")
        print("   See function documentation for implementation options")
        
        # TODO: Implement proper Microsoft OAuth flow
        # For now, returning mock token - replace with real implementation
        return "mock_microsoft_token"
    
    def _authenticate_xbox(self, ms_token: str) -> Optional[str]:
        """Authenticate with Xbox Live using Microsoft token"""
        try:
            payload = {
                "Properties": {
                    "AuthMethod": "RPS",
                    "SiteName": "user.auth.xboxlive.com",
                    "RpsTicket": f"d={ms_token}"
                },
                "RelyingParty": "http://auth.xboxlive.com",
                "TokenType": "JWT"
            }
            
            response = self.session.post(
                self.XBOX_AUTH_URL,
                json=payload,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get('Token')
            
            return None
            
        except Exception as e:
            print(f"Xbox authentication error: {e}", file=sys.stderr)
            return None
    
    def _get_xsts_token(self, xbox_token: str) -> Optional[Dict[str, str]]:
        """Get XSTS token for Minecraft"""
        try:
            payload = {
                "Properties": {
                    "SandboxId": "RETAIL",
                    "UserTokens": [xbox_token]
                },
                "RelyingParty": "rp://api.minecraftservices.com/",
                "TokenType": "JWT"
            }
            
            response = self.session.post(
                self.XBOX_XSTS_URL,
                json=payload,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'token': data.get('Token'),
                    'uhs': data['DisplayClaims']['xui'][0]['uhs']
                }
            
            return None
            
        except Exception as e:
            print(f"XSTS token error: {e}", file=sys.stderr)
            return None
    
    def _authenticate_minecraft(self, xsts_token: str, user_hash: str) -> Optional[str]:
        """Authenticate with Minecraft using XSTS token"""
        try:
            payload = {
                "identityToken": f"XBL3.0 x={user_hash};{xsts_token}"
            }
            
            response = self.session.post(
                self.MINECRAFT_AUTH_URL,
                json=payload,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get('access_token')
            
            return None
            
        except Exception as e:
            print(f"Minecraft authentication error: {e}", file=sys.stderr)
            return None


def main():
    """CLI entry point for authentication"""
    username = os.environ.get('MINECRAFT_USERNAME')
    password = os.environ.get('MINECRAFT_PASSWORD')
    
    if not username or not password:
        print("Error: MINECRAFT_USERNAME and MINECRAFT_PASSWORD environment variables required")
        sys.exit(1)
    
    auth = MinecraftAuth(username, password)
    result = auth.authenticate()
    
    if result:
        print("\nAuthentication successful!")
        print(f"Access Token: {result['access_token'][:20]}...")
        # Save tokens to file for use by other scripts
        with open('/tmp/minecraft_tokens.json', 'w') as f:
            json.dump(result, f)
        print("Tokens saved to /tmp/minecraft_tokens.json")
    else:
        print("\nAuthentication failed!")
        sys.exit(1)


if __name__ == '__main__':
    main()

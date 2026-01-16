#!/bin/bash

# Generate strong JWT secrets for production
echo "Generating JWT secrets..."
echo ""
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo ""
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
echo ""
echo "Copy these to your .env file or deployment platform environment variables."

#!/bin/bash

# Setup script for comment likes system
echo "Setting up comment likes system..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Execute the SQL file
echo "Creating likes tables and functions..."
supabase db reset

# Apply the likes system
if supabase db push --include-all; then
    echo "✅ Comment likes system setup completed successfully!"
    echo ""
    echo "The following has been created:"
    echo "- comment_likes table with RLS policies"
    echo "- Functions for like counting and toggling"
    echo "- Indexes for better performance"
    echo ""
    echo "You can now use the like functionality in your YouTube video player!"
else
    echo "❌ Failed to setup comment likes system"
    echo "Please check your Supabase connection and try again"
    exit 1
fi

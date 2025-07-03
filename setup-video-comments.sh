#!/bin/bash

# Script to set up video comments functionality in Supabase
# This script will create the video_comments table and related functionality

echo "Setting up video comments database table..."

# Check which SQL file to use
if [ -f "create_video_comments_table_simple.sql" ]; then
    SQL_FILE="create_video_comments_table_simple.sql"
    echo "Using simple SQL file (no foreign key constraints)"
elif [ -f "create_video_comments_table.sql" ]; then
    SQL_FILE="create_video_comments_table.sql"
    echo "Using full SQL file (with foreign key constraints)"
else
    echo "Error: No SQL file found. Please ensure create_video_comments_table.sql exists."
    exit 1
fi

# Option 1: If you have Supabase CLI installed
if command -v supabase &> /dev/null; then
    echo ""
    echo "Option 1: Using Supabase CLI (Recommended)"
    echo "========================================="
    
    # Check if we're in a Supabase project
    if [ -f "supabase/config.toml" ]; then
        echo "Creating migration file..."
        
        # Create a new migration file
        MIGRATION_NAME="create_video_comments_table"
        TIMESTAMP=$(date +%Y%m%d%H%M%S)
        MIGRATION_FILE="supabase/migrations/${TIMESTAMP}_${MIGRATION_NAME}.sql"
        
        # Copy the SQL content to the migration file
        cp "$SQL_FILE" "$MIGRATION_FILE"
        
        echo "Migration file created: $MIGRATION_FILE"
        
        # Apply the migration to local database
        echo "Applying migration to local database..."
        supabase db reset
        
        if [ $? -eq 0 ]; then
            echo "✅ Video comments table created successfully!"
            echo ""
            echo "To push to production: supabase db push"
        else
            echo "❌ Error applying migration. Try Option 2 below."
        fi
    else
        echo "Error: Not in a Supabase project directory"
        echo "Run 'supabase init' first or try Option 2 below"
    fi
else
    echo "Supabase CLI not found. Using manual option..."
fi

echo ""
echo "Option 2: Manual Setup (If CLI doesn't work)"
echo "==========================================="
echo "1. Go to your Supabase dashboard"
echo "2. Navigate to SQL Editor"
echo "3. Copy and paste the following SQL:"
echo ""
echo "--- COPY FROM HERE ---"
cat "$SQL_FILE"
echo ""
echo "--- COPY UNTIL HERE ---"
echo ""

echo "Next steps after running the SQL:"
echo "1. Test the comments functionality in your app"
echo "2. Check that the table was created in Database > Tables"
echo ""
echo "Table structure:"
echo "- video_comments table with columns:"
echo "  * id (UUID, primary key)"
echo "  * video_id (TEXT, references video ID from your app)"
echo "  * course_id (UUID, should match your course IDs)"
echo "  * comments (JSONB array for storing comments and replies)"
echo "  * created_at, updated_at (timestamps)"
echo ""
echo "Comment structure in JSONB:"
echo "- Each comment has: id, user_id, user_name, user_image, comment_text, timestamp, likes"
echo "- Replies are nested in each comment's 'replies' array"
echo "- Row Level Security (RLS) is enabled with appropriate policies"

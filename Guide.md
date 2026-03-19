# Guide for Inside Inspiration Academy

## App Overview
Inside Inspiration Academy is an intuitive platform designed to provide inspiring educational resources and seamless user experience for different roles like guests, students, and admins.

## Prerequisites
- Latest version of Node.js
- MongoDB or the database specified in the configuration 
- Supabase account (for backend services)

## Environment Variables
- `DATABASE_URL`: URL for the database connection
- `SUPABASE_URL`: URL for Supabase services
- `SUPABASE_KEY`: Key for accessing Supabase services

## Setup
1. Clone the repository
   ```bash
   git clone https://github.com/Captain-Per0xide/inside_inpiration_academy.git
   cd inside_inpiration_academy
   ```
2. Install dependencies
   ```bash
   npm install
   ```
3. Set up environment variables in a `.env` file
   ```
   touch .env
   ```
   Add the following variables:
   ```
   DATABASE_URL=your_database_url
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ```

## Run Commands
- To start the application:  
  ```bash
  npm start
  ```
- To run tests:  
  ```bash
  npm test
  ```

## Routing Map
| Route               | Description                                                         |
|---------------------|---------------------------------------------------------------------|
| `/`                 | Home Page                                                          |
| `/login`            | Login page for users                                               |
| `/register`         | Registration page for new users                                   |
| `/dashboard`        | User dashboard offering personalized content                        |
| `/courses`          | List of available courses                                          |
| `/courses/:id`     | Details for a specific course                                       |
| `/admin`           | Admin dashboard with management tools                              |
| `/profile`         | User profile page                                                 |
| `/logout`          | Logout route                                                      |

## Role-Based Flows
- **Guest**: Can browse publicly available content without account.
- **Student**: Can register, access courses, and track progress.
- **Admin**: Has full control over the app, can manage users, courses, and reports.
- **Banned**: Limited access, cannot interact until unbanned.

## Supabase Schema Expectations
- **Users**: Should include fields for id, email, password, role.
- **Courses**: Should include fields for id, name, description, creator, and published status.
- **Payments**: Should track payment details linked to users and courses.
- **Materials**: Should reference resources tied to specific courses.
- **Videos**: Should include video id, title, and URL.

## Storage Bucket Paths
- `bucket:/user_uploads/` - for user-uploaded materials
- `bucket:/course_materials/` - for course specific materials

## Push Notifications
Utilize service workers for triggering notifications for updates and important events.

## PDF/Video Players
Integrate libraries such as pdf.js for PDF handling and video.js for video playback.

## Troubleshooting
- If the app does not start, ensure all environment variables are set correctly.
- Check the console for any errors and resolve them as needed.
- For dependency issues, try deleting `node_modules` and running `npm install` again.

---
This guide is intended to provide the foundational knowledge needed to effectively manage and navigate Inside Inspiration Academy. For any further assistance, please refer to the official documentation or contact support.
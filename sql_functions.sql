-- SQL function to remove a course ID from all users' enrolled_courses arrays
-- Run this in your Supabase SQL editor to create the function

CREATE OR REPLACE FUNCTION remove_course_from_all_users(course_id_to_remove text)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET enrolled_courses = array_remove(enrolled_courses, course_id_to_remove)
  WHERE enrolled_courses @> ARRAY[course_id_to_remove];
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION remove_course_from_all_users(text) TO authenticated;

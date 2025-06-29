import PaymentComponent from '@/components/payment';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { supabase } from '@/lib/supabase';
import { getCurrentDate, getCurrentISOString, getCurrentMonthName, getCurrentYear } from '@/utils/testDate';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface Course {
    id: string;
    full_name: string;
    fees_monthly: number;
    fees_total: number | null;
    course_type: string;
    codename: string;
    enrolled_students?: any[];
    course_duration?: number | null;
}

interface PaymentRecord {
    course_id: string;
    course_name: string;
    month: string;
    status: 'pending' | 'success' | 'failed';
    txn_id: string;
    amount: number;
    created_at: string;
    course_type?: string;
}

interface CoursePaymentStatus {
    course_id: string;
    month: string;
    status: 'due' | 'success' | 'pending';
}

const PaymentScreen = () => {
    const [selectedTab, setSelectedTab] = useState<'payments' | 'history'>('payments');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [screenData, setScreenData] = useState(Dimensions.get("window"));
    const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
    const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
    const [userInfo, setUserInfo] = useState<any>(null);
    const [coursePaymentStatuses, setCoursePaymentStatuses] = useState<CoursePaymentStatus[]>([]);

    // Payment flow state
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [selectedCourseForPayment, setSelectedCourseForPayment] = useState<string | null>(null);
    const [selectedPaymentMonth, setSelectedPaymentMonth] = useState<string | null>(null);

    // Theme setup
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const backgroundColor = useThemeColor({ light: '#f5f6fa', dark: '#111827' }, 'background');
    const textColor = useThemeColor({ light: '#333', dark: '#fff' }, 'text');
    const cardColor = useThemeColor({ light: '#fff', dark: '#1F2937' }, 'background');
    const subtitleColor = useThemeColor({ light: '#666', dark: '#9CA3AF' }, 'text');

    useEffect(() => {
        const onChange = (result: { window: any }) => {
            setScreenData(result.window);
        };

        const subscription = Dimensions.addEventListener("change", onChange);
        return () => subscription?.remove();
    }, []);

    // Helper function to get months between two dates
    const getMonthsBetween = useCallback((startDate: Date, endDate: Date): string[] => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
        const result: string[] = [];

        const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

        while (start <= end) {
            result.push(months[start.getMonth()]);
            start.setMonth(start.getMonth() + 1);
        }

        return result;
    }, []);

    const fetchUserInfo = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('users')
                .select('id, name, enrolled_courses')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Error fetching user info:', error);
                return;
            }

            setUserInfo(data);

            // Extract all course IDs from enrolled_courses array regardless of status
            if (data.enrolled_courses && Array.isArray(data.enrolled_courses)) {
                // Extract all course IDs regardless of status
                const courseIds = data.enrolled_courses
                    .filter((enrollment: any) => enrollment && enrollment.course_id)
                    .map((enrollment: any) => enrollment.course_id);

                console.log('📚 Extracted all enrolled course IDs:', courseIds);

                if (courseIds.length > 0) {
                    await fetchEnrolledCourses(courseIds);
                    await checkCoursePaymentStatuses(user.id, courseIds);
                    await fetchPaymentHistory(user.id, courseIds);
                }
            } else {
                console.log('📚 No enrolled courses found');
                setEnrolledCourses([]);
                setCoursePaymentStatuses([]);
                setPaymentHistory([]);
            }
        } catch (error) {
            console.error('Error in fetchUserInfo:', error);
        }
    }, []);

    const fetchEnrolledCourses = useCallback(async (courseIds: string[]) => {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('id, full_name, fees_monthly, fees_total, course_type, codename, enrolled_students, course_duration')
                .in('id', courseIds);

            if (error) {
                console.error('Error fetching courses:', error);
                return;
            }

            setEnrolledCourses(data || []);
        } catch (error) {
            console.error('Error in fetchEnrolledCourses:', error);
        }
    }, []);

    // Helper function to get user's enrollment date for a course
    const getUserEnrollmentDate = useCallback((course: Course, userId: string): Date | null => {
        if (!course.enrolled_students || !Array.isArray(course.enrolled_students)) {
            console.log(`❌ No enrolled_students data for course ${course.id}`);
            return null;
        }

        // Find the user in the course's enrolled_students array
        const userEnrollment = course.enrolled_students.find(
            (student: any) => student && student.user_id === userId
        );

        if (!userEnrollment) {
            console.log(`❌ User ${userId} not found in course ${course.id} enrolled_students`);
            return null;
        }

        if (!userEnrollment.approve_date) {
            console.log(`❌ No approve_date found for user ${userId} in course ${course.id}`);
            return null;
        }

        const enrollmentDate = new Date(userEnrollment.approve_date);
        console.log(`✅ Found enrollment date for user ${userId} in course ${course.id}: ${enrollmentDate.toISOString()}`);
        return enrollmentDate;
    }, []);

    // Helper function to get month name from date
    const getMonthName = useCallback((date: Date): string => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
        return months[date.getMonth()];
    }, []);

    const checkCoursePaymentStatuses = useCallback(async (userId: string, courseIds: string[]) => {
        try {
            console.log(`🔍 Checking payment statuses for user ${userId} with courses:`, courseIds);

            // Use real current date
            const currentDate = getCurrentDate();
            console.log(`📅 Using current date: ${currentDate.toISOString()}`);
            const statuses: CoursePaymentStatus[] = [];

            // First, get course data with enrollment information
            const { data: coursesData, error: coursesError } = await supabase
                .from('courses')
                .select('id, full_name, enrolled_students, course_type, fees_total, course_duration')
                .in('id', courseIds);

            if (coursesError) {
                console.error('Error fetching courses for enrollment data:', coursesError);
                return;
            }

            console.log(`📚 Found ${coursesData?.length || 0} courses`);

            for (const courseId of courseIds) {
                console.log(`\n🔄 Processing course: ${courseId}`);

                const courseData = coursesData?.find(c => c.id === courseId);
                if (!courseData) {
                    console.log(`❌ Course data not found for ${courseId}`);
                    continue;
                }

                // Find user's enrollment date for this course
                let enrollmentDate: Date | null = null;
                if (courseData.enrolled_students && Array.isArray(courseData.enrolled_students)) {
                    const userEnrollment = courseData.enrolled_students.find(
                        (student: any) => student && student.user_id === userId
                    );

                    if (userEnrollment && userEnrollment.approve_date) {
                        enrollmentDate = new Date(userEnrollment.approve_date);
                        console.log(`✅ Found enrollment for user ${userId} in course ${courseId}: ${enrollmentDate.toISOString()}`);
                    }
                }

                if (!enrollmentDate) {
                    console.log(`❌ No enrollment date found for user ${userId} in course ${courseId}`);
                    continue;
                }

                // Log enrollment scenarios
                if (enrollmentDate.getTime() > currentDate.getTime()) {
                    console.log(`⚠️  FUTURE ENROLLMENT: User enrolled after current date - no payments should be due`);
                    continue;
                } else {
                    const monthsDiff = (currentDate.getFullYear() - enrollmentDate.getFullYear()) * 12 +
                        (currentDate.getMonth() - enrollmentDate.getMonth());
                    console.log(`📊 PAYMENT LOGIC: ${monthsDiff + 1} months should be checked for payment (from enrollment to current)`);
                }

                // Get all months from enrollment date to current date
                const relevantMonths = getMonthsBetween(enrollmentDate, currentDate);
                console.log(`📅 Course ${courseId} (${courseData.full_name}):`);
                console.log(`   Enrollment Date: ${enrollmentDate.toISOString()}`);
                console.log(`   Current Date: ${currentDate.toISOString()}`);
                console.log(`   Relevant months:`, relevantMonths);

                // Get fee data for this course
                const { data: feeData, error } = await supabase
                    .from('fees')
                    .select('*')
                    .eq('id', courseId)
                    .single();

                if (error || !feeData) {
                    console.log(`⚠️  No fee record exists for course ${courseId} - marking all months as due`);
                    // If no fee record exists, mark all relevant months as due
                    for (const month of relevantMonths) {
                        statuses.push({
                            course_id: courseId,
                            month,
                            status: 'due'
                        });
                    }
                    continue;
                }

                // Get course info to check for elective duration logic
                const courseInfo = coursesData?.find(c => c.id === courseId);
                const isElectiveCourse = courseInfo && courseInfo.course_type === 'elective' && courseInfo.fees_total && courseInfo.course_duration;

                // Check payment status for each relevant month
                for (const month of relevantMonths) {
                    // Special handling for elective courses with duration
                    if (isElectiveCourse) {
                        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
                        const enrollmentMonthName = monthNames[enrollmentDate.getMonth()];
                        const enrollmentYear = enrollmentDate.getFullYear();
                        const courseDurationEndDate = new Date(enrollmentYear, enrollmentDate.getMonth() + courseInfo.course_duration);
                        const currentMonthDate = getCurrentDate();

                        // If current date is within course duration, check if total fee was paid
                        if (currentMonthDate < courseDurationEndDate) {
                            // Check if total fee was paid in enrollment month
                            const enrollmentMonthData = feeData[enrollmentMonthName];
                            if (enrollmentMonthData && Array.isArray(enrollmentMonthData)) {
                                const enrollmentPayment = enrollmentMonthData.find((payment: any) =>
                                    payment.user_id === userId &&
                                    payment.status === 'success' &&
                                    payment.amount === courseInfo.fees_total
                                );

                                if (enrollmentPayment) {
                                    // Total fee paid, mark all months within duration as success
                                    console.log(`✅ Total fee paid for elective course ${courseId}, marking ${month} as success`);
                                    statuses.push({
                                        course_id: courseId,
                                        month,
                                        status: 'success'
                                    });
                                    continue;
                                }
                            }
                        }
                    }

                    const monthData = feeData[month];

                    if (!monthData || !Array.isArray(monthData)) {
                        // No payment data for this month - mark as due
                        console.log(`❌ No payment data for ${month} in course ${courseId}`);
                        statuses.push({
                            course_id: courseId,
                            month,
                            status: 'due'
                        });
                        continue;
                    }

                    // Check if user has any payment record for this month
                    const userPayment = monthData.find((payment: any) => payment.user_id === userId);

                    if (!userPayment) {
                        // No payment record for this user in this month - mark as due
                        console.log(`❌ No payment record for user ${userId} in ${month} for course ${courseId}`);
                        statuses.push({
                            course_id: courseId,
                            month,
                            status: 'due'
                        });
                    } else {
                        // User has a payment record, use its status
                        console.log(`✅ Found payment record for user ${userId} in ${month} for course ${courseId}: ${userPayment.status}`);
                        statuses.push({
                            course_id: courseId,
                            month,
                            status: userPayment.status
                        });
                    }
                }
            }

            console.log(`\n📋 PAYMENT STATUS SUMMARY:`);
            console.log(`Total statuses: ${statuses.length}`);
            statuses.forEach(status => {
                console.log(`   ${status.course_id} - ${status.month}: ${status.status}`);
            });

            setCoursePaymentStatuses(statuses);
        } catch (error) {
            console.error('Error in checkCoursePaymentStatuses:', error);
        }
    }, [getMonthsBetween, getCurrentDate]);

    const fetchPaymentHistory = useCallback(async (userId: string, courseIds: string[]) => {
        try {
            const history: PaymentRecord[] = [];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

            for (const courseId of courseIds) {
                const { data: feeData, error } = await supabase
                    .from('fees')
                    .select('*')
                    .eq('id', courseId)
                    .single();

                if (error || !feeData) continue;

                const { data: courseData } = await supabase
                    .from('courses')
                    .select('full_name, fees_monthly, fees_total, course_type')
                    .eq('id', courseId)
                    .single();

                months.forEach(month => {
                    const monthData = feeData[month];
                    if (monthData && Array.isArray(monthData)) {
                        // Filter for successful payments only and only for this user
                        const userSuccessfulPayments = monthData.filter((payment: any) =>
                            payment.user_id === userId && payment.status === 'success'
                        );

                        userSuccessfulPayments.forEach((payment: any) => {
                            // Use fees_monthly for Core Curriculum, fees_total for Elective
                            const amount = courseData?.course_type === 'Core Curriculum'
                                ? courseData?.fees_monthly || 0
                                : courseData?.fees_total || 0;

                            history.push({
                                course_id: courseId,
                                course_name: courseData?.full_name || 'Unknown Course',
                                month,
                                status: payment.status,
                                txn_id: payment.txn_id,
                                amount: amount,
                                created_at: payment.created_at || getCurrentISOString(),
                                course_type: courseData?.course_type || 'Unknown'
                            });
                        });
                    }
                });
            }

            // Sort by month order and then by created_at
            const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
            history.sort((a, b) => {
                const monthDiff = monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month);
                if (monthDiff !== 0) return monthDiff;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            setPaymentHistory(history);
        } catch (error) {
            console.error('Error in fetchPaymentHistory:', error);
        }
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchUserInfo();
        setRefreshing(false);
    }, [fetchUserInfo]);

    // Function to check all enrollments on screen load to restore course access when dues are cleared
    const checkAllEnrollmentStatuses = useCallback(async () => {
        try {
            if (!userInfo?.id) return;

            console.log('🔄 Checking all enrollment statuses for automatic restoration...');

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('enrolled_courses')
                .eq('id', userInfo.id)
                .single();

            if (userError || !userData.enrolled_courses) {
                return;
            }

            const pendingEnrollments = userData.enrolled_courses.filter(
                (enrollment: any) => enrollment && enrollment.status === 'pending'
            );

            if (pendingEnrollments.length === 0) {
                console.log('✅ No pending enrollments found');
                return;
            }

            console.log(`🔍 Found ${pendingEnrollments.length} pending enrollment(s), checking dues status...`);

            let hasStatusUpdates = false;
            const updatedEnrollments = [...userData.enrolled_courses];

            for (let i = 0; i < updatedEnrollments.length; i++) {
                const enrollment = updatedEnrollments[i];
                if (!enrollment || enrollment.status !== 'pending') continue;

                const courseId = enrollment.course_id;

                // Get course enrollment date
                const { data: courseData, error: courseError } = await supabase
                    .from('courses')
                    .select('enrolled_students, full_name')
                    .eq('id', courseId)
                    .single();

                if (courseError || !courseData.enrolled_students) continue;

                const userEnrollment = courseData.enrolled_students.find(
                    (student: any) => student.user_id === userInfo.id
                );

                if (!userEnrollment || !userEnrollment.approve_date) continue;

                const enrollmentDate = new Date(userEnrollment.approve_date);
                const currentDate = getCurrentDate();
                const requiredMonths = getMonthsBetween(enrollmentDate, currentDate);

                // Check payment status for all required months
                const { data: feeData, error: feeError } = await supabase
                    .from('fees')
                    .select('*')
                    .eq('id', courseId)
                    .single();

                if (feeError || !feeData) continue;

                let allMonthsPaid = true;
                const unpaidMonths: string[] = [];

                for (const month of requiredMonths) {
                    const monthData = feeData[month];

                    if (!monthData || !Array.isArray(monthData)) {
                        allMonthsPaid = false;
                        unpaidMonths.push(month);
                        continue;
                    }

                    const userPayment = monthData.find((payment: any) =>
                        payment.user_id === userInfo.id && payment.status === 'success'
                    );

                    if (!userPayment) {
                        allMonthsPaid = false;
                        unpaidMonths.push(month);
                    }
                }

                if (allMonthsPaid) {
                    console.log(`✅ All dues cleared for course ${courseData.full_name}! Restoring status to success`);
                    updatedEnrollments[i] = {
                        ...enrollment,
                        status: 'success',
                        restored_date: getCurrentISOString(),
                        restoration_reason: `Auto-restored on app load ${currentDate.toLocaleDateString()}: All dues cleared`
                    };
                    hasStatusUpdates = true;
                } else {
                    console.log(`⚠️  Course ${courseData.full_name} still has unpaid months: ${unpaidMonths.join(', ')}`);
                }
            }

            if (hasStatusUpdates) {
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ enrolled_courses: updatedEnrollments })
                    .eq('id', userInfo.id);

                if (!updateError) {
                    console.log('🎉 Successfully restored enrollment status(es) to success');
                    // Refresh data to show updated status
                    await fetchUserInfo();
                } else {
                    console.error('❌ Error updating enrollment status:', updateError);
                }
            }
        } catch (error) {
            console.error('❌ Error checking all enrollment statuses:', error);
        }
    }, [userInfo?.id, getMonthsBetween, getCurrentDate, fetchUserInfo]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await fetchUserInfo();

            // Check for automatic status restoration after data loads
            setTimeout(() => {
                checkAllEnrollmentStatuses();
            }, 1500);

            setLoading(false);
        };
        loadData();
    }, [fetchUserInfo]); // Removed checkAllEnrollmentStatuses from dependency to avoid circular dependency

    const getCourseFee = (course: Course, paymentMonth?: string) => {
        // For Core Curriculum, always show monthly fee
        if (course.course_type === 'Core Curriculum') {
            return course.fees_monthly;
        }

        // For elective courses with duration and total fee
        if (course.course_type === 'elective' && course.fees_total && course.course_duration) {
            // Find enrollment info for this course from userInfo
            const enrollmentEntry = userInfo?.enrolled_courses?.find((enrollment: any) =>
                enrollment && enrollment.course_id === course.id
            );

            if (!enrollmentEntry) {
                return course.fees_total || course.fees_monthly || 0;
            }

            // Get enrollment date from course.enrolled_students
            const enrollmentDate = getUserEnrollmentDate(course, userInfo?.id);

            if (!enrollmentDate) {
                return course.fees_total || course.fees_monthly || 0;
            }

            const enrollmentMonth = enrollmentDate.getMonth() + 1;
            const enrollmentYear = enrollmentDate.getFullYear();

            // If payment month is provided, check if it's the enrollment month
            if (paymentMonth) {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
                const enrollmentMonthName = monthNames[enrollmentMonth - 1];

                // If paying for enrollment month, show total fee
                if (paymentMonth === enrollmentMonthName) {
                    return course.fees_total;
                }

                // If paying for subsequent months within course duration, check if total fee was already paid
                const currentMonth = getCurrentDate().getMonth() + 1;
                const currentYear = getCurrentYear();

                // Check if the payment month is within course duration
                const paymentMonthIndex = monthNames.indexOf(paymentMonth);
                const paymentMonthDate = new Date(currentYear, paymentMonthIndex);
                const courseDurationEndDate = new Date(enrollmentYear, enrollmentMonth - 1 + course.course_duration);

                if (paymentMonthDate >= enrollmentDate && paymentMonthDate < courseDurationEndDate) {
                    // Check if total fee was paid in enrollment month
                    const enrollmentPayment = paymentHistory.find(p =>
                        p.course_id === course.id &&
                        p.month === enrollmentMonthName &&
                        p.status === 'success' &&
                        p.amount === course.fees_total
                    );

                    if (enrollmentPayment) {
                        // Total fee already paid, no additional payment needed
                        return 0;
                    }
                }

                // Fall back to monthly fee for subsequent months
                return course.fees_monthly;
            }

            // Default: show total fee for elective courses
            return course.fees_total;
        }

        // Fall back to total fee or monthly fee
        return course.fees_total || course.fees_monthly || 0;
    };

    const getFeeLabel = (course: Course, paymentMonth?: string) => {
        if (course.course_type === 'Core Curriculum') {
            return 'Monthly Fee:';
        }

        // For elective courses with duration and total fee
        if (course.course_type === 'elective' && course.fees_total && course.course_duration) {
            // Get enrollment date
            const enrollmentDate = getUserEnrollmentDate(course, userInfo?.id);

            if (enrollmentDate && paymentMonth) {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
                const enrollmentMonthName = monthNames[enrollmentDate.getMonth()];

                // If paying for enrollment month, show total fee
                if (paymentMonth === enrollmentMonthName) {
                    return `Total Fee (${course.course_duration} months):`;
                }

                // Check if total fee was already paid and if payment month is within duration
                const enrollmentPayment = paymentHistory.find(p =>
                    p.course_id === course.id &&
                    p.month === enrollmentMonthName &&
                    p.status === 'success' &&
                    p.amount === course.fees_total
                );

                if (enrollmentPayment) {
                    // Check if payment month is within course duration
                    const enrollmentMonth = enrollmentDate.getMonth() + 1;
                    const enrollmentYear = enrollmentDate.getFullYear();
                    const paymentMonthIndex = monthNames.indexOf(paymentMonth);
                    const paymentMonthDate = new Date(enrollmentYear, paymentMonthIndex);
                    const courseDurationEndDate = new Date(enrollmentYear, enrollmentMonth - 1 + course.course_duration);

                    if (paymentMonthDate >= enrollmentDate && paymentMonthDate < courseDurationEndDate) {
                        return 'Covered by Total Fee:';
                    }
                }

                return 'Monthly Fee:';
            }

            return 'Total Fee:';
        }

        return course.course_type === 'Core Curriculum' ? 'Monthly Fee:' : 'Total Fee:';
    };

    const getCoursePaymentStatus = (courseId: string): 'due' | 'success' | 'pending' => {
        const currentMonth = getCurrentMonthName();
        const status = coursePaymentStatuses.find(s => s.course_id === courseId && s.month === currentMonth);
        return status?.status || 'due';
    };

    const getDueMonthsForCourse = (courseId: string): string[] => {
        return coursePaymentStatuses
            .filter(s => s.course_id === courseId && s.status === 'due')
            .map(s => s.month);
    };

    const getPendingMonthsForCourse = (courseId: string): string[] => {
        return coursePaymentStatuses
            .filter(s => s.course_id === courseId && s.status === 'pending')
            .map(s => s.month);
    };

    const getPaymentButtonConfig = (course: Course) => {
        const status = getCoursePaymentStatus(course.id);
        const dueMonths = getDueMonthsForCourse(course.id);
        const pendingMonths = getPendingMonthsForCourse(course.id);
        const currentMonth = getCurrentMonthName();

        // Special handling for elective courses with duration and total fee
        if (course.course_type === 'elective' && course.fees_total && course.course_duration) {
            const enrollmentDate = getUserEnrollmentDate(course, userInfo?.id);

            if (enrollmentDate) {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
                const enrollmentMonthName = monthNames[enrollmentDate.getMonth()];
                const enrollmentYear = enrollmentDate.getFullYear();
                const currentDate = getCurrentDate();
                const courseDurationEndDate = new Date(enrollmentYear, enrollmentDate.getMonth() + course.course_duration);

                // Check if total fee was paid in enrollment month
                const enrollmentPayment = paymentHistory.find(p =>
                    p.course_id === course.id &&
                    p.month === enrollmentMonthName &&
                    p.status === 'success' &&
                    p.amount === course.fees_total
                );

                if (enrollmentPayment && currentDate < courseDurationEndDate) {
                    return {
                        text: `Covered until ${monthNames[courseDurationEndDate.getMonth()]} ${courseDurationEndDate.getFullYear()}`,
                        icon: 'checkmark-circle' as const,
                        color: '#10B981',
                        textColor: '#fff',
                        disabled: true
                    };
                }
            }
        }

        switch (status) {
            case 'success':
                return {
                    text: `Paid for ${currentMonth}`,
                    icon: 'checkmark-circle' as const,
                    color: '#10B981',
                    textColor: '#fff',
                    disabled: true
                };
            case 'pending':
                return {
                    text: `${currentMonth} - Waiting for verification`,
                    icon: 'time' as const,
                    color: '#F59E0B',
                    textColor: '#fff',
                    disabled: true
                };
            case 'due':
            default:
                if (dueMonths.length > 1) {
                    // Find the oldest due month to pay first
                    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
                    const sortedDueMonths = dueMonths.sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
                    const oldestDueMonth = sortedDueMonths[0];

                    return {
                        text: `Pay ${oldestDueMonth} (${dueMonths.length} months due)`,
                        icon: 'card' as const,
                        color: '#EF4444',
                        textColor: '#fff',
                        disabled: false,
                        oldestDueMonth: oldestDueMonth
                    };
                } else if (dueMonths.length === 1) {
                    return {
                        text: `Pay ${dueMonths[0]}`,
                        icon: 'card' as const,
                        color: '#FF5734',
                        textColor: '#fff',
                        disabled: false,
                        oldestDueMonth: dueMonths[0]
                    };
                } else {
                    return {
                        text: `Pay ${currentMonth}`,
                        icon: 'card' as const,
                        color: '#FF5734',
                        textColor: '#fff',
                        disabled: false,
                        oldestDueMonth: currentMonth
                    };
                }
        }
    };

    const handleMakePayment = (course: Course) => {
        const buttonConfig = getPaymentButtonConfig(course);
        const dueMonths = getDueMonthsForCourse(course.id);
        const paymentMonth = buttonConfig.oldestDueMonth || getCurrentMonthName();

        const fee = getCourseFee(course, paymentMonth);
        const feeType = course.course_type === 'Core Curriculum' ? 'monthly' : 'total';

        let alertMessage = `Make payment for ${course.full_name}\nAmount: ₹${fee} (${feeType})\nPayment for: ${paymentMonth}`;

        if (dueMonths.length > 1) {
            alertMessage += `\n\nNote: You have ${dueMonths.length} months due. You must pay chronologically starting with ${paymentMonth}.`;
        }

        Alert.alert(
            'Make Payment',
            alertMessage,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Proceed', onPress: () => {
                        // Show payment form for this course with specific month
                        setSelectedCourseForPayment(course.id);
                        setSelectedPaymentMonth(paymentMonth); // Pass the specific month
                        setShowPaymentForm(true);
                    }
                }
            ]
        );
    };

    // Function to check if enrollment status should be restored after payment success
    const checkEnrollmentStatusAfterPayment = useCallback(async () => {
        try {
            if (!userInfo?.id) return;

            console.log('🔍 Checking enrollment status after payment success...');

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('enrolled_courses')
                .eq('id', userInfo.id)
                .single();

            if (userError || !userData.enrolled_courses) {
                console.log('❌ Could not fetch user enrollment data');
                return;
            }

            let hasStatusUpdates = false;
            const updatedEnrollments = [...userData.enrolled_courses];

            for (let i = 0; i < updatedEnrollments.length; i++) {
                const enrollment = updatedEnrollments[i];
                if (!enrollment || enrollment.status !== 'pending') continue;

                const courseId = enrollment.course_id;
                console.log(`🔄 Checking dues status for course ${courseId}...`);

                // Get course enrollment date
                const { data: courseData, error: courseError } = await supabase
                    .from('courses')
                    .select('enrolled_students')
                    .eq('id', courseId)
                    .single();

                if (courseError || !courseData.enrolled_students) continue;

                const userEnrollment = courseData.enrolled_students.find(
                    (student: any) => student.user_id === userInfo.id
                );

                if (!userEnrollment || !userEnrollment.approve_date) continue;

                const enrollmentDate = new Date(userEnrollment.approve_date);
                const currentDate = getCurrentDate();
                const requiredMonths = getMonthsBetween(enrollmentDate, currentDate);

                // Check payment status for all required months
                const { data: feeData, error: feeError } = await supabase
                    .from('fees')
                    .select('*')
                    .eq('id', courseId)
                    .single();

                if (feeError || !feeData) continue;

                let allMonthsPaid = true;

                for (const month of requiredMonths) {
                    const monthData = feeData[month];

                    if (!monthData || !Array.isArray(monthData)) {
                        allMonthsPaid = false;
                        break;
                    }

                    const userPayment = monthData.find((payment: any) =>
                        payment.user_id === userInfo.id && payment.status === 'success'
                    );

                    if (!userPayment) {
                        allMonthsPaid = false;
                        break;
                    }
                }

                if (allMonthsPaid) {
                    console.log(`✅ All dues cleared for course ${courseId}! Restoring status to success`);
                    updatedEnrollments[i] = {
                        ...enrollment,
                        status: 'success',
                        restored_date: getCurrentISOString(),
                        restoration_reason: `Auto-restored on ${currentDate.toLocaleDateString()}: All dues cleared`
                    };
                    hasStatusUpdates = true;
                }
            }

            if (hasStatusUpdates) {
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ enrolled_courses: updatedEnrollments })
                    .eq('id', userInfo.id);

                if (!updateError) {
                    console.log('🎉 Successfully restored enrollment status(es) to success');

                    // Show user-friendly notification
                    Alert.alert(
                        'Course Access Restored!',
                        'Great news! Your course access has been restored because your payment dues are now up to date.',
                        [{ text: 'OK' }]
                    );

                    // Refresh user data to reflect changes
                    fetchUserInfo();
                } else {
                    console.error('❌ Error updating enrollment status:', updateError);
                }
            }
        } catch (error) {
            console.error('❌ Error checking enrollment status after payment:', error);
        }
    }, [userInfo?.id, getMonthsBetween, getCurrentDate, fetchUserInfo]);

    const handlePaymentSuccess = () => {
        // Refresh data after successful payment
        setShowPaymentForm(false);
        setSelectedCourseForPayment(null);
        setSelectedPaymentMonth(null);

        Alert.alert(
            'Payment Submitted',
            'Your payment has been submitted successfully and will be verified within 24 hours.',
            [{
                text: 'OK',
                onPress: () => {
                    // Check if enrollment status should be restored after some delay
                    // to allow for payment processing
                    setTimeout(() => {
                        checkEnrollmentStatusAfterPayment();
                    }, 1000);
                }
            }]
        );

        fetchUserInfo(); // Refresh all data
    };

    const handleBackFromPayment = () => {
        setShowPaymentForm(false);
        setSelectedCourseForPayment(null);
        setSelectedPaymentMonth(null);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return '#10B981';
            case 'pending': return '#F59E0B';
            case 'failed': return '#EF4444';
            default: return '#6B7280';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return 'checkmark-circle';
            case 'pending': return 'time';
            case 'failed': return 'close-circle';
            default: return 'help-circle';
        }
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor }]}>
                <ActivityIndicator size="large" color="#FF5734" />
                <Text style={[styles.loadingText, { color: subtitleColor }]}>Loading payment information...</Text>
            </View>
        );
    }

    // Show payment form when a course is selected for payment
    if (showPaymentForm && selectedCourseForPayment) {
        return (
            <PaymentComponent
                courseId={selectedCourseForPayment}
                paymentMonth={selectedPaymentMonth || undefined}
                onPaymentSuccess={handlePaymentSuccess}
                onBack={handleBackFromPayment}
            />
        );
    }

    const isSmallScreen = screenData.width < 600;

    return (
        <ScrollView
            style={[styles.container, { backgroundColor }]}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            <Text style={[styles.title, { fontSize: isSmallScreen ? 24 : 28, color: textColor }]}>
                Payments
            </Text>

            {/* Tab Navigation */}
            <View style={[styles.tabContainer, { backgroundColor: cardColor }]}>
                <TouchableOpacity
                    style={[
                        styles.tabButton,
                        selectedTab === 'payments' && styles.activeTabButton,
                    ]}
                    onPress={() => setSelectedTab('payments')}
                >
                    <Ionicons
                        name="card-outline"
                        size={isSmallScreen ? 18 : 20}
                        color={selectedTab === 'payments' ? '#fff' : (isDark ? '#9CA3AF' : '#9CA3AF')}
                    />
                    <Text
                        style={[
                            styles.tabButtonText,
                            {
                                fontSize: isSmallScreen ? 14 : 16,
                                color: selectedTab === 'payments' ? '#fff' : (isDark ? '#9CA3AF' : '#9CA3AF')
                            },
                            selectedTab === 'payments' && styles.activeTabButtonText,
                        ]}
                    >
                        My Payments
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tabButton,
                        selectedTab === 'history' && styles.activeTabButton,
                    ]}
                    onPress={() => setSelectedTab('history')}
                >
                    <Ionicons
                        name="receipt-outline"
                        size={isSmallScreen ? 18 : 20}
                        color={selectedTab === 'history' ? '#fff' : (isDark ? '#9CA3AF' : '#9CA3AF')}
                    />
                    <Text
                        style={[
                            styles.tabButtonText,
                            {
                                fontSize: isSmallScreen ? 14 : 16,
                                color: selectedTab === 'history' ? '#fff' : (isDark ? '#9CA3AF' : '#9CA3AF')
                            },
                            selectedTab === 'history' && styles.activeTabButtonText,
                        ]}
                    >
                        Payment History
                    </Text>
                </TouchableOpacity>
            </View>

            {selectedTab === 'payments' ? (
                <View style={styles.tabContent}>
                    <Text style={[styles.subtitle, { fontSize: isSmallScreen ? 14 : 16, color: subtitleColor }]}>
                        Make payments for your enrolled courses
                    </Text>

                    {enrolledCourses.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="school-outline" size={80} color={isDark ? '#4B5563' : '#9CA3AF'} />
                            <Text style={[styles.emptyStateTitle, { color: textColor }]}>No Enrolled Courses</Text>
                            <Text style={[styles.emptyStateText, { color: subtitleColor }]}>
                                You haven't enrolled in any courses yet.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.coursesContainer}>
                            {enrolledCourses.map((course) => {
                                const buttonConfig = getPaymentButtonConfig(course);
                                const dueMonths = getDueMonthsForCourse(course.id);
                                const pendingMonths = getPendingMonthsForCourse(course.id);

                                return (
                                    <View key={course.id} style={[styles.courseCard, { backgroundColor: cardColor }]}>
                                        <View style={styles.courseHeader}>
                                            <View>
                                                <Text style={[styles.courseName, { fontSize: isSmallScreen ? 16 : 18, color: textColor }]}>
                                                    {course.full_name}
                                                </Text>
                                                <Text style={[styles.courseCode, { color: subtitleColor }]}>
                                                    {course.codename}
                                                </Text>
                                                <View style={[styles.courseTypeBadge, {
                                                    backgroundColor: course.course_type === 'Core Curriculum' ? '#10B981' : '#F59E0B'
                                                }]}>
                                                    <Text style={styles.courseTypeText}>
                                                        {course.course_type === 'Core Curriculum' ? 'Core' : 'Elective'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={[styles.courseIcon, { backgroundColor: isDark ? 'rgba(255, 87, 52, 0.2)' : 'rgba(255, 87, 52, 0.1)' }]}>
                                                <Ionicons name="book" size={24} color="#FF5734" />
                                            </View>
                                        </View>

                                        <View style={styles.paymentInfo}>
                                            {(() => {
                                                const paymentMonth = buttonConfig.oldestDueMonth || getCurrentMonthName();
                                                return (
                                                    <>
                                                        <Text style={[styles.amountLabel, { color: subtitleColor }]}>{getFeeLabel(course, paymentMonth)}</Text>
                                                        <Text style={[styles.amount, { fontSize: isSmallScreen ? 20 : 24 }]}>
                                                            ₹{getCourseFee(course, paymentMonth)}
                                                        </Text>
                                                    </>
                                                );
                                            })()}

                                            {/* Payment Status Information */}

                                            {/* Payment Status Information */}
                                            {dueMonths.length > 0 && (
                                                <View style={styles.paymentStatusInfo}>
                                                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                                                    <Text style={[styles.paymentStatusText, { color: '#EF4444' }]}>
                                                        {dueMonths.length} month{dueMonths.length > 1 ? 's' : ''} overdue: {dueMonths.join(', ')}
                                                    </Text>
                                                </View>
                                            )}

                                            {pendingMonths.length > 0 && (
                                                <View style={styles.paymentStatusInfo}>
                                                    <Ionicons name="time" size={16} color="#F59E0B" />
                                                    <Text style={[styles.paymentStatusText, { color: '#F59E0B' }]}>
                                                        {pendingMonths.length} payment{pendingMonths.length > 1 ? 's' : ''} pending: {pendingMonths.join(', ')}
                                                    </Text>
                                                </View>
                                            )}

                                            {/* Monthly Payment Status Breakdown */}
                                            {(dueMonths.length > 1 || pendingMonths.length > 0) && (
                                                <View style={styles.monthlyBreakdown}>
                                                    <Text style={[styles.breakdownTitle, { color: textColor }]}>
                                                        Monthly Payment Status:
                                                    </Text>
                                                    <View style={styles.monthlyStatusGrid}>
                                                        {(() => {
                                                            // Get user's enrollment date for this course
                                                            const enrollmentDate = getUserEnrollmentDate(course, userInfo?.id);
                                                            if (!enrollmentDate) return null;

                                                            // Get relevant months from enrollment to current (TESTING: Using September)
                                                            const currentDate = getCurrentDate();
                                                            const relevantMonths = getMonthsBetween(enrollmentDate, currentDate);

                                                            return relevantMonths.map(month => {
                                                                const monthStatus = coursePaymentStatuses.find(s =>
                                                                    s.course_id === course.id && s.month === month
                                                                );

                                                                let statusColor = '#6B7280';
                                                                let statusIcon = 'help-circle';

                                                                if (monthStatus) {
                                                                    switch (monthStatus.status) {
                                                                        case 'success':
                                                                            statusColor = '#10B981';
                                                                            statusIcon = 'checkmark-circle';
                                                                            break;
                                                                        case 'pending':
                                                                            statusColor = '#F59E0B';
                                                                            statusIcon = 'time';
                                                                            break;
                                                                        case 'due':
                                                                            statusColor = '#EF4444';
                                                                            statusIcon = 'close-circle';
                                                                            break;
                                                                    }
                                                                } else {
                                                                    statusColor = '#EF4444';
                                                                    statusIcon = 'close-circle';
                                                                }

                                                                return (
                                                                    <View key={month} style={[styles.monthStatusItem, { borderColor: statusColor }]}>
                                                                        <Text style={[styles.monthStatusText, { color: statusColor }]}>
                                                                            {month}
                                                                        </Text>
                                                                        <Ionicons name={statusIcon as any} size={16} color={statusColor} />
                                                                    </View>
                                                                );
                                                            });
                                                        })()}
                                                    </View>
                                                </View>
                                            )}
                                        </View>

                                        <TouchableOpacity
                                            style={[
                                                styles.payButton,
                                                { backgroundColor: buttonConfig.color },
                                                buttonConfig.disabled && styles.disabledButton
                                            ]}
                                            onPress={() => !buttonConfig.disabled && handleMakePayment(course)}
                                            disabled={buttonConfig.disabled}
                                        >
                                            <Ionicons name={buttonConfig.icon} size={20} color={buttonConfig.textColor} />
                                            <Text style={[styles.payButtonText, { color: buttonConfig.textColor, fontSize: isSmallScreen ? 14 : 16 }]}>
                                                {buttonConfig.text}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.tabContent}>
                    <Text style={[styles.subtitle, { fontSize: isSmallScreen ? 14 : 16, color: subtitleColor }]}>
                        View your successful payment history
                    </Text>

                    {paymentHistory.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="receipt-outline" size={80} color={isDark ? '#4B5563' : '#9CA3AF'} />
                            <Text style={[styles.emptyStateTitle, { color: textColor }]}>No Payment History</Text>
                            <Text style={[styles.emptyStateText, { color: subtitleColor }]}>
                                You haven't made any successful payments yet.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.historyContainer}>
                            {(() => {
                                // Group payments by month
                                const monthOrder = ['Dec', 'Nov', 'Oct', 'Sept', 'Aug', 'Jul', 'Jun', 'May', 'Apr', 'Mar', 'Feb', 'Jan'];
                                const groupedByMonth: { [month: string]: PaymentRecord[] } = {};

                                paymentHistory.forEach(payment => {
                                    if (!groupedByMonth[payment.month]) {
                                        groupedByMonth[payment.month] = [];
                                    }
                                    groupedByMonth[payment.month].push(payment);
                                });

                                return monthOrder.map(month => {
                                    const monthPayments = groupedByMonth[month];
                                    if (!monthPayments || monthPayments.length === 0) return null;

                                    return (
                                        <View key={month} style={styles.monthSection}>
                                            <View style={[styles.monthHeader, { backgroundColor: cardColor }]}>
                                                <Ionicons name="calendar" size={20} color="#FF5734" />
                                                <Text style={[styles.monthTitle, { fontSize: isSmallScreen ? 18 : 20, color: textColor }]}>
                                                    {month} 2025
                                                </Text>
                                                <View style={styles.monthBadge}>
                                                    <Text style={styles.monthBadgeText}>
                                                        {monthPayments.length} payment{monthPayments.length !== 1 ? 's' : ''}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.monthPayments}>
                                                {monthPayments.map((payment, index) => (
                                                    <View key={`${payment.course_id}-${payment.month}-${index}`} style={[styles.historyCard, { backgroundColor: cardColor }]}>
                                                        <View style={styles.historyHeader}>
                                                            <View style={styles.historyMainInfo}>
                                                                <Text style={[styles.historyCourseName, { fontSize: isSmallScreen ? 14 : 16, color: textColor }]}>
                                                                    {payment.course_name}
                                                                </Text>
                                                                <Text style={[styles.historyMonth, { color: subtitleColor }]}>
                                                                    Payment for {payment.month}
                                                                </Text>
                                                                {payment.course_type && (
                                                                    <View style={[styles.historyCourseBadge, {
                                                                        backgroundColor: payment.course_type === 'Core Curriculum' ? '#10B981' : '#F59E0B'
                                                                    }]}>
                                                                        <Text style={styles.historyCourseTypeText}>
                                                                            {payment.course_type === 'Core Curriculum' ? 'Core' : 'Elective'}
                                                                        </Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                            <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]}>
                                                                <Ionicons
                                                                    name="checkmark-circle"
                                                                    size={14}
                                                                    color="#fff"
                                                                />
                                                                <Text style={styles.statusText}>Success</Text>
                                                            </View>
                                                        </View>

                                                        <View style={styles.historyDetails}>
                                                            <View style={styles.historyDetailRow}>
                                                                <Ionicons name="card-outline" size={16} color={isDark ? '#6B7280' : '#9CA3AF'} />
                                                                <Text style={[styles.historyDetailText, { color: subtitleColor }]}>
                                                                    TXN ID: {payment.txn_id}
                                                                </Text>
                                                            </View>
                                                            <View style={styles.historyDetailRow}>
                                                                <Ionicons name="cash-outline" size={16} color={isDark ? '#6B7280' : '#9CA3AF'} />
                                                                <Text style={[styles.historyDetailText, { color: subtitleColor }]}>
                                                                    Amount: ₹{payment.amount}
                                                                </Text>
                                                            </View>
                                                            <View style={styles.historyDetailRow}>
                                                                <Ionicons name="calendar-outline" size={16} color={isDark ? '#6B7280' : '#9CA3AF'} />
                                                                <Text style={[styles.historyDetailText, { color: subtitleColor }]}>
                                                                    Date: {new Date(payment.created_at).toLocaleDateString()}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    );
                                }).filter(Boolean);
                            })()}
                        </View>
                    )}
                </View>
            )}
        </ScrollView>
    );
};

export default PaymentScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    title: {
        fontWeight: 'bold',
        marginBottom: 24,
        marginTop: 20,
        textAlign: 'center',
    },
    subtitle: {
        textAlign: 'center',
        marginBottom: 24,
    },

    // Tab Styles
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
    },
    activeTabButton: {
        backgroundColor: '#FF5734',
    },
    tabButtonText: {
        fontWeight: '600',
    },
    activeTabButtonText: {
        color: '#fff',
    },

    // Content Styles
    tabContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },

    // Empty State Styles
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
    },

    // Course Cards Styles
    coursesContainer: {
        gap: 16,
    },
    courseCard: {
        borderRadius: 16,
        padding: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    courseHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    courseName: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    courseCode: {
        fontSize: 14,
        fontStyle: 'italic',
    },
    courseTypeBadge: {
        marginTop: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    courseTypeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    courseIcon: {
        padding: 12,
        borderRadius: 50,
    },
    paymentInfo: {
        marginBottom: 20,
    },
    paymentStatusInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 6,
    },
    paymentStatusText: {
        fontSize: 14,
        fontWeight: '500',
    },
    amountLabel: {
        fontSize: 16,
        marginBottom: 4,
    },
    amount: {
        fontWeight: 'bold',
        color: '#FF5734',
    },
    payButton: {
        backgroundColor: '#FF5734',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    payButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.8,
    },

    // History Styles
    historyContainer: {
        gap: 20,
    },

    // Month Section Styles
    monthSection: {
        marginBottom: 24,
    },
    monthHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    monthTitle: {
        fontWeight: 'bold',
        marginLeft: 12,
        flex: 1,
    },
    monthBadge: {
        backgroundColor: '#FF5734',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    monthBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    monthPayments: {
        gap: 8,
        paddingLeft: 16,
    },

    historyCard: {
        borderRadius: 12,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    historyMainInfo: {
        flex: 1,
        marginRight: 12,
    },
    historyCourseName: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    historyMonth: {
        fontSize: 14,
    },
    historyCourseBadge: {
        marginTop: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    historyCourseTypeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '600',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    historyDetails: {
        gap: 8,
    },
    historyDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    historyDetailText: {
        fontSize: 14,
        flex: 1,
    },

    // Monthly breakdown styles
    monthlyBreakdown: {
        marginTop: 16,
        padding: 12,
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        borderRadius: 8,
    },
    breakdownTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    monthlyStatusGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    monthStatusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        gap: 4,
        minWidth: 60,
    },
    monthStatusText: {
        fontSize: 12,
        fontWeight: '500',
    },

    // Testing mode styles
    testingModeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 1,
        borderColor: '#F59E0B',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginHorizontal: 20,
        marginBottom: 20,
        gap: 8,
    },
    testingModeText: {
        color: '#F59E0B',
        fontSize: 14,
        fontWeight: '600',
    },

    // Legacy styles (keeping for compatibility)
    card: {
        width: '80%',
        padding: 24,
        borderRadius: 12,
        backgroundColor: '#fff',
        elevation: 3,
        alignItems: 'center',
    },
    label: {
        fontSize: 18,
        marginBottom: 8,
    },
    button: {
        backgroundColor: '#FF5734',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});
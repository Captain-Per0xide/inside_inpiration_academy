import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { supabase } from '@/lib/supabase';
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
    codename: string;
}

interface PaymentRecord {
    course_id: string;
    course_name: string;
    month: string;
    status: 'pending' | 'success' | 'failed';
    txn_id: string;
    amount: number;
    created_at: string;
}

const PaymentScreen = () => {
    const [selectedTab, setSelectedTab] = useState<'payments' | 'history'>('payments');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [screenData, setScreenData] = useState(Dimensions.get("window"));
    const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
    const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
    const [userInfo, setUserInfo] = useState<any>(null);
    
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
            if (data.enrolled_courses && data.enrolled_courses.length > 0) {
                await fetchEnrolledCourses(data.enrolled_courses);
                await fetchPaymentHistory(user.id, data.enrolled_courses);
            }
        } catch (error) {
            console.error('Error in fetchUserInfo:', error);
        }
    }, []);

    const fetchEnrolledCourses = useCallback(async (courseIds: string[]) => {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('id, full_name, fees_monthly, codename')
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
                    .select('full_name, fees_monthly')
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
                            history.push({
                                course_id: courseId,
                                course_name: courseData?.full_name || 'Unknown Course',
                                month,
                                status: payment.status,
                                txn_id: payment.txn_id,
                                amount: courseData?.fees_monthly || 0,
                                created_at: payment.created_at || new Date().toISOString()
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

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await fetchUserInfo();
            setLoading(false);
        };
        loadData();
    }, [fetchUserInfo]);

    const handleMakePayment = (course: Course) => {
        // TODO: Navigate to payment form or show payment modal
        Alert.alert(
            'Make Payment',
            `Make payment for ${course.full_name}\nAmount: ₹${course.fees_monthly}`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Proceed', onPress: () => {
                    // Navigate to payment form
                    console.log('Navigate to payment form for course:', course.id);
                }}
            ]
        );
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
                <ActivityIndicator size="large" color="#4e8cff" />
                <Text style={[styles.loadingText, { color: subtitleColor }]}>Loading payment information...</Text>
            </View>
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
                            {enrolledCourses.map((course) => (
                                <View key={course.id} style={[styles.courseCard, { backgroundColor: cardColor }]}>
                                    <View style={styles.courseHeader}>
                                        <View>
                                            <Text style={[styles.courseName, { fontSize: isSmallScreen ? 16 : 18, color: textColor }]}>
                                                {course.full_name}
                                            </Text>
                                            <Text style={[styles.courseCode, { color: subtitleColor }]}>
                                                {course.codename}
                                            </Text>
                                        </View>
                                        <View style={[styles.courseIcon, { backgroundColor: isDark ? 'rgba(78, 140, 255, 0.2)' : 'rgba(78, 140, 255, 0.1)' }]}>
                                            <Ionicons name="book" size={24} color="#4e8cff" />
                                        </View>
                                    </View>

                                    <View style={styles.paymentInfo}>
                                        <Text style={[styles.amountLabel, { color: subtitleColor }]}>Monthly Fee:</Text>
                                        <Text style={[styles.amount, { fontSize: isSmallScreen ? 20 : 24 }]}>
                                            ₹{course.fees_monthly}
                                        </Text>
                                    </View>

                                    <TouchableOpacity 
                                        style={styles.payButton} 
                                        onPress={() => handleMakePayment(course)}
                                    >
                                        <Ionicons name="card" size={20} color="#fff" />
                                        <Text style={styles.payButtonText}>Make Payment</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
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
                                                <Ionicons name="calendar" size={20} color="#4e8cff" />
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
        backgroundColor: '#4e8cff',
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
    courseIcon: {
        padding: 12,
        borderRadius: 50,
    },
    paymentInfo: {
        marginBottom: 20,
    },
    amountLabel: {
        fontSize: 16,
        marginBottom: 4,
    },
    amount: {
        fontWeight: 'bold',
        color: '#4e8cff',
    },
    payButton: {
        backgroundColor: '#4e8cff',
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
        backgroundColor: '#4e8cff',
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
        backgroundColor: '#4e8cff',
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
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/authService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';

export default function BannedPage() {
    const [userName, setUserName] = useState<string>('User');
    const [userGender, setUserGender] = useState<string>('unknown');
    const [shakeAnimation] = useState(new Animated.Value(0));
    const [pulseAnimation] = useState(new Animated.Value(1));
    const [fireAnimation] = useState(new Animated.Value(0));
    const [rotateAnimation] = useState(new Animated.Value(0));
    const [cryAnimation] = useState(new Animated.Value(0));
    const [humiliationCount, setHumiliationCount] = useState<number>(0);
    const [sound, setSound] = useState<Audio.Sound | null>(null);

    useEffect(() => {
        fetchUserData();
        startAnimations();
        startCryingEffect();
        trackHumiliation();
        loadAndPlayBackgroundMusic();
        
        // Cleanup function to stop music when component unmounts
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchUserData = async () => {
        try {
            const email = await authService.getCurrentUserEmail();
            if (email) {
                // Extract name from email
                const name = email.split('@')[0];
                setUserName(name.charAt(0).toUpperCase() + name.slice(1));

                // Fetch user data from Supabase
                const { data, error } = await supabase
                    .from('users')
                    .select('gender, name')
                    .eq('email', email)
                    .single();

                if (data && !error) {
                    setUserGender(data.gender || 'unknown');
                    if (data.name) {
                        setUserName(data.name);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
        }
    };

    const loadAndPlayBackgroundMusic = async () => {
        try {
            // Configure audio mode
            await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                staysActiveInBackground: true,
                playsInSilentModeIOS: true,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
            });

            // Load the dramatic background music
            const { sound: newSound } = await Audio.Sound.createAsync(
                require('../../assets/sounds/sad-meow-song.mp3'), // Replace with your actual sound file
                {
                    isLooping: true,
                    volume: 0.3, // Lower volume so it doesn't overpower
                    shouldPlay: true,
                }
            );

            setSound(newSound);
        } catch (error) {
            console.error('Error loading background music:', error);
        }
    };

    const trackHumiliation = async () => {
        try {
            const stored = await AsyncStorage.getItem('humiliation_count');
            const count = stored ? parseInt(stored) + 1 : 1;
            setHumiliationCount(count);
            await AsyncStorage.setItem('humiliation_count', count.toString());

            // Vibrate device for psychological impact
            Vibration.vibrate([500, 300, 500, 300, 1000]);
        } catch (error) {
            console.error('Error tracking humiliation:', error);
        }
    };

    const startCryingEffect = () => {
        const crySequence = Animated.sequence([
            Animated.timing(cryAnimation, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: true,
            }),
            Animated.timing(cryAnimation, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
            }),
        ]);
        Animated.loop(crySequence).start();
    };

    const startAnimations = () => {
        // Shake animation for the banned icon
        const shakeSequence = Animated.sequence([
            Animated.timing(shakeAnimation, {
                toValue: 15,
                duration: 80,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnimation, {
                toValue: -15,
                duration: 80,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnimation, {
                toValue: 15,
                duration: 80,
                useNativeDriver: true,
            }),
            Animated.timing(shakeAnimation, {
                toValue: 0,
                duration: 80,
                useNativeDriver: true,
            }),
        ]);

        // Pulse animation for warning elements
        const pulseSequence = Animated.sequence([
            Animated.timing(pulseAnimation, {
                toValue: 1.15,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnimation, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
        ]);

        // Fire/burning effect
        const fireSequence = Animated.sequence([
            Animated.timing(fireAnimation, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            }),
            Animated.timing(fireAnimation, {
                toValue: 0,
                duration: 1500,
                useNativeDriver: true,
            }),
        ]);

        // Rotation for skull
        const rotateSequence = Animated.timing(rotateAnimation, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
        });

        // Start infinite loops
        Animated.loop(shakeSequence).start();
        Animated.loop(pulseSequence).start();
        Animated.loop(fireSequence).start();
        Animated.loop(rotateSequence).start();
    };

    const handleLogout = async () => {
        try {
            // Stop background music
            if (sound) {
                await sound.stopAsync();
                await sound.unloadAsync();
            }
            
            // Track final humiliation
            await AsyncStorage.setItem('banned_user_cried', 'true');
            await authService.logout();
            router.replace('/(auth)');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const getGenderSpecificLogoutInsult = () => {
        const maleInsults = [
            '🔥 LEAVING SO SOON, BOY? Good! No real man would act like you! You\'re a DISGRACE to masculinity! 🔥\n\n🤮 Even your father is ashamed to call you his son! 🤮',
            '💀 What a WEAK little boy! Running away crying like the PATHETIC loser you are! 💀\n\n😭 Your ancestors are rolling in their graves! 😭'
        ];

        const femaleInsults = [
            '🔥 CRYING AND LEAVING, PRINCESS? Good! No respectable woman would behave like you! You\'re a SHAME to your gender! 🔥\n\n🤮 Even your mother regrets raising such a DISAPPOINTMENT! 🤮',
            '💀 What a WEAK little girl! Running away sobbing like the PATHETIC failure you are! 💀\n\n😭 Your grandmother would disown you! 😭'
        ];

        if (userGender === 'male') {
            return maleInsults[Math.floor(Math.random() * maleInsults.length)];
        } else if (userGender === 'female') {
            return femaleInsults[Math.floor(Math.random() * femaleInsults.length)];
        } else {
            return '🔥 LEAVING SO SOON? Good! Nobody wants a DISGRACE like you here anyway! 🔥\n\n🤮 Everyone will celebrate your departure! 🤮';
        }
    };

    const getGenderSpecificMessages = () => {
        const maleMessages = [
            'You\'re not a real man, just a pathetic boy',
            'Your father is ashamed of the weak son he raised',
            'No woman will ever respect such a spineless male',
            'You\'ll die alone because you\'re not man enough',
            'Your ancestors are disgusted by your weakness',
            'You bring shame to your entire male lineage',
            'Even little boys are braver than you',
            'You\'re a coward who hides behind excuses',
            'Your weakness makes other men laugh at you',
            'You\'ll never be the man your father wanted',
        ];

        const femaleMessages = [
            'You\'re a disgrace to all women everywhere',
            'Your mother cries knowing she raised such a failure',
            'No decent man will ever want such a pathetic woman',
            'You\'ll die as a lonely, bitter old spinster',
            'Your female relatives are ashamed of you',
            'You bring dishonor to your entire family name',
            'Even teenage girls have more dignity than you',
            'You\'re the reason people stereotype women negatively',
            'Your behavior makes other women embarrassed',
            'You\'ll never be the woman your mother dreamed of',
        ];

        const neutralMessages = [
            'Everyone is laughing at your pathetic failure',
            'You are a disgrace to your entire family',
            'Your parents are ashamed they ever had you',
            'You will never succeed at anything in life',
            'Nobody respects you or ever will again',
            'You are worthless and completely pathetic',
            'Your reputation is permanently destroyed forever',
            'You have brought shame to your family name',
            'Everyone knows you are a complete failure',
            'You deserve all the humiliation you receive',
        ];

        if (userGender === 'male') {
            return [...maleMessages, ...neutralMessages];
        } else if (userGender === 'female') {
            return [...femaleMessages, ...neutralMessages];
        } else {
            return neutralMessages;
        }
    };

    const getGenderSpecificConsequences = () => {
        const maleConsequences = [
            { emoji: '💀', text: 'Your masculinity is DEAD and buried' },
            { emoji: '🔥', text: 'No woman will ever find you attractive' },
            { emoji: '😭', text: 'Your father disowns you publicly' },
            { emoji: '🤮', text: 'Other men mock your weakness' },
            { emoji: '🗑️', text: 'Your male pride is in the TRASH' },
            { emoji: '💔', text: 'You\'ll die alone and unloved' },
        ];

        const femaleConsequences = [
            { emoji: '💀', text: 'Your femininity is DESTROYED forever' },
            { emoji: '🔥', text: 'No decent man will ever marry you' },
            { emoji: '😭', text: 'Your mother disowns you publicly' },
            { emoji: '🤮', text: 'Other women gossip about your shame' },
            { emoji: '🗑️', text: 'Your reputation as a woman is RUINED' },
            { emoji: '💔', text: 'You\'ll die as a bitter spinster' },
        ];

        const neutralConsequences = [
            { emoji: '🔥', text: 'Your education dreams are DEAD' },
            { emoji: '💀', text: 'Your career prospects are ANNIHILATED' },
            { emoji: '🗑️', text: 'Your reputation is in the TRASH forever' },
            { emoji: '😭', text: 'Your parents cry thinking about you' },
            { emoji: '🤮', text: 'Society rejects you completely' },
            { emoji: '🔥', text: 'You will DIE as a failure' },
        ];

        if (userGender === 'male') {
            return [...maleConsequences, ...neutralConsequences];
        } else if (userGender === 'female') {
            return [...femaleConsequences, ...neutralConsequences];
        } else {
            return neutralConsequences;
        }
    };

    const demotivatingMessages = getGenderSpecificMessages();
    const genderConsequences = getGenderSpecificConsequences();

    const crowdLaughs = [
        '😂 HAHAHAHA! Look at this loser!',
        '🤣 What a complete failure!',
        '😆 How embarrassing!',
        '🫵 Point and laugh everyone!',
        '💀 RIP to your dignity!',
        '🤡 Certified clown behavior!',
        '🗑️ Absolute trash human!',
        '🤮 So disgusting!',
    ];

    return (
        <View style={styles.container}>
            {/* Background pattern */}
            <View style={styles.backgroundPattern} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header with animated banned icon */}
                <View style={styles.header}>
                    <Animated.View
                        style={[
                            styles.bannedIconContainer,
                            {
                                transform: [
                                    { translateX: shakeAnimation },
                                    { scale: pulseAnimation }
                                ]
                            }
                        ]}
                    >
                        <Ionicons name="ban" size={80} color="#DC2626" />
                        <Animated.Text
                            style={[
                                styles.skullEmoji,
                                {
                                    transform: [{
                                        rotate: rotateAnimation.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: ['0deg', '360deg'],
                                        })
                                    }],
                                    opacity: fireAnimation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.8, 1],
                                    })
                                }
                            ]}
                        >
                            💀
                        </Animated.Text>
                    </Animated.View>

                    <Text style={styles.bannedTitle}>🚫 ACCOUNT TERMINATED 🚫</Text>
                </View>
            </ScrollView>

            {/* Logout button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={20} color="#DC2626" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F0F0F',
    },
    backgroundPattern: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
        backgroundColor: 'blue',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 100,
    },
    header: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        minHeight: '80%',
    },
    bannedIconContainer: {
        backgroundColor: '#1F1F1F',
        borderRadius: 60,
        padding: 20,
        borderWidth: 3,
        borderColor: '#DC2626',
        marginBottom: 20,
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 15,
        position: 'relative',
    },
    skullEmoji: {
        position: 'absolute',
        top: -10,
        right: -10,
        fontSize: 30,
    },
    bannedTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#DC2626',
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: 2,
        textShadowColor: '#DC2626',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    shameText: {
        fontSize: 20,
        color: '#F87171',
        textAlign: 'center',
        fontWeight: '600',
        marginBottom: 10,
    },
    crowdLaugh: {
        fontSize: 16,
        color: '#FBBF24',
        textAlign: 'center',
        fontWeight: 'bold',
        marginTop: 10,
    },
    humiliationContainer: {
        backgroundColor: '#1F1F1F',
        borderRadius: 12,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#DC2626',
    },
    humiliationTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#DC2626',
        textAlign: 'center',
        marginBottom: 15,
    },
    crowdReactions: {
        gap: 8,
    },
    laughCard: {
        backgroundColor: '#7F1D1D',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    laughText: {
        fontSize: 14,
        color: '#FECACA',
        fontWeight: 'bold',
    },
    shameContainer: {
        paddingHorizontal: 20,
        gap: 20,
    },
    shameCard: {
        backgroundColor: '#1F1F1F',
        borderRadius: 12,
        padding: 20,
        borderWidth: 2,
        borderColor: '#DC2626',
    },
    shameHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10,
    },
    shameCardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#DC2626',
    },
    reasonText: {
        fontSize: 16,
        color: '#F87171',
        lineHeight: 24,
        fontWeight: '600',
    },
    consequencesCard: {
        backgroundColor: '#1F1F1F',
        borderRadius: 12,
        padding: 20,
        borderWidth: 2,
        borderColor: '#7F1D1D',
    },
    consequencesTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#DC2626',
        marginBottom: 15,
        textAlign: 'center',
    },
    consequencesList: {
        gap: 12,
    },
    consequenceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    consequenceText: {
        fontSize: 16,
        color: '#F87171',
        flex: 1,
        fontWeight: '600',
    },
    messagesContainer: {
        backgroundColor: '#1F1F1F',
        borderRadius: 12,
        padding: 20,
        borderWidth: 2,
        borderColor: '#7F1D1D',
    },
    messagesTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#DC2626',
        marginBottom: 15,
        textAlign: 'center',
    },
    messageCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#7F1D1D',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        gap: 10,
    },
    messageText: {
        fontSize: 14,
        color: '#FECACA',
        flex: 1,
        fontStyle: 'italic',
        fontWeight: '600',
    },
    finalShameContainer: {
        backgroundColor: '#1F1F1F',
        borderRadius: 12,
        padding: 20,
        borderWidth: 3,
        borderColor: '#DC2626',
        alignItems: 'center',
    },
    finalShameTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#DC2626',
        marginBottom: 15,
        textAlign: 'center',
        textShadowColor: '#DC2626',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    finalShameText: {
        fontSize: 16,
        color: '#F87171',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 15,
        fontWeight: '600',
    },
    reflectionText: {
        fontSize: 14,
        color: '#F87171',
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 20,
        marginBottom: 15,
        fontWeight: '600',
    },
    finalInsult: {
        fontSize: 16,
        color: '#DC2626',
        textAlign: 'center',
        fontWeight: 'bold',
        backgroundColor: '#7F1D1D',
        padding: 10,
        borderRadius: 8,
    },
    bottomWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7F1D1D',
        padding: 15,
        borderRadius: 8,
        gap: 10,
    },
    warningText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FECACA',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1F1F1F',
        padding: 20,
        borderTopWidth: 2,
        borderTopColor: '#DC2626',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#7F1D1D',
        padding: 15,
        borderRadius: 8,
        gap: 10,
        borderWidth: 1,
        borderColor: '#DC2626',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    cryingText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#DC2626',
        textAlign: 'center',
        marginTop: 15,
        backgroundColor: '#7F1D1D',
        padding: 10,
        borderRadius: 8,
        textShadowColor: '#DC2626',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 5,
    },
    humiliationCounter: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FBBF24',
        textAlign: 'center',
        marginTop: 10,
        backgroundColor: '#1F1F1F',
        padding: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FBBF24',
    },
});

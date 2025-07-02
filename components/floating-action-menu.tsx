import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Animated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface FloatingActionMenuProps {
    onScheduleClass: () => void;
    onUploadVideo: () => void;
}

const FloatingActionMenu: React.FC<FloatingActionMenuProps> = ({
    onScheduleClass,
    onUploadVideo,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [animation] = useState(new Animated.Value(0));
    const [rotateAnimation] = useState(new Animated.Value(0));

    const toggleMenu = () => {
        const toValue = isOpen ? 0 : 1;

        Animated.parallel([
            Animated.spring(animation, {
                toValue,
                useNativeDriver: true,
                speed: 16,
                bounciness: 6,
            }),
            Animated.timing(rotateAnimation, {
                toValue,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        setIsOpen(!isOpen);
    };

    const handleOptionPress = (action: () => void) => {
        toggleMenu();
        setTimeout(action, 100);
    };

    const rotation = rotateAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '45deg'],
    });

    return (
        <>
            {isOpen && (
                <TouchableOpacity
                    style={styles.overlay}
                    onPress={toggleMenu}
                    activeOpacity={1}
                />
            )}

            <View style={styles.container}>
                {/* Upload Video Option */}
                <Animated.View
                    style={[
                        styles.menuItem,
                        {
                            transform: [
                                {
                                    translateY: animation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, -140],
                                    }),
                                },
                                {
                                    scale: animation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, 1],
                                    }),
                                },
                            ],
                            opacity: animation,
                        },
                    ]}
                >
                    <Text style={styles.menuText}>Upload Video</Text>
                    <TouchableOpacity
                        style={[styles.menuButton, styles.uploadButton]}
                        onPress={() => handleOptionPress(onUploadVideo)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="videocam-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                </Animated.View>

                {/* Schedule Class Option */}
                <Animated.View
                    style={[
                        styles.menuItem,
                        {
                            transform: [
                                {
                                    translateY: animation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, -80],
                                    }),
                                },
                                {
                                    scale: animation.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0, 1],
                                    }),
                                },
                            ],
                            opacity: animation,
                        },
                    ]}
                >
                    <Text style={styles.menuText}>Schedule Class</Text>
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => handleOptionPress(onScheduleClass)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="calendar-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                </Animated.View>

                {/* Main FAB */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={toggleMenu}
                    activeOpacity={0.8}
                >
                    <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                        <Ionicons name="add" size={28} color="#fff" />
                    </Animated.View>
                </TouchableOpacity>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 998,
    },
    container: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        alignItems: 'flex-end',
        zIndex: 999,
    },
    fab: {
        width: 60,
        height: 60,
        borderRadius: 15,
        backgroundColor: '#FF5734',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        position: 'absolute',
        right: 0,
    },
    menuButton: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    uploadButton: {
        backgroundColor: '#10B981',
    },
    menuText: {
        marginRight: 12,
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        overflow: 'hidden',
        textAlign: 'center',
        width: 100,
    },
});

export default FloatingActionMenu;

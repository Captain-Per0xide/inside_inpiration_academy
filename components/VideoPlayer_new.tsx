import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface VideoPlayerProps {
    videoUrl: string;
    thumbnailUrl?: string;
    title?: string;
    style?: any;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
    videoUrl,
    thumbnailUrl,
    title,
    style,
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [showControls, setShowControls] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    const player = useVideoPlayer(videoUrl, (player) => {
        player.loop = false;
    });

    const { width } = Dimensions.get('window');
    const videoHeight = (width * 9) / 16; // 16:9 aspect ratio

    useEffect(() => {
        const subscription = player.addListener('statusChange', (status) => {
            if (status.status === 'loading') {
                setIsLoading(true);
                setError(null);
            } else if (status.status === 'readyToPlay') {
                setIsLoading(false);
                setDuration(player.duration);
            } else if (status.status === 'error') {
                setIsLoading(false);
                setError('Failed to load video');
            }
        });

        const timeSubscription = player.addListener('timeUpdate', (time) => {
            setCurrentTime(time.currentTime);
        });

        const playingSubscription = player.addListener('playingChange', (payload) => {
            setIsPlaying(payload.isPlaying);
        });

        return () => {
            subscription.remove();
            timeSubscription.remove();
            playingSubscription.remove();
        };
    }, [player]);

    const formatTime = (seconds: number) => {
        const totalSeconds = Math.floor(seconds);
        const minutes = Math.floor(totalSeconds / 60);
        const remainingSeconds = totalSeconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const handlePlayPause = () => {
        if (isPlaying) {
            player.pause();
        } else {
            player.play();
        }
    };

    const handleSeek = (seekTime: number) => {
        if (duration > 0) {
            const newPosition = Math.max(0, Math.min(seekTime, duration));
            player.currentTime = newPosition;
        }
    };

    const handleForward = () => {
        const newPosition = Math.min(currentTime + 10, duration); // 10 seconds forward
        handleSeek(newPosition);
    };

    const handleBackward = () => {
        const newPosition = Math.max(currentTime - 10, 0); // 10 seconds backward
        handleSeek(newPosition);
    };

    const toggleMute = () => {
        player.muted = !isMuted;
        setIsMuted(!isMuted);
    };

    const handleFullscreen = () => {
        // Note: Fullscreen functionality may need to be implemented differently in expo-video
        // Check the documentation for the current implementation
        console.log('Fullscreen requested - implementation may vary');
    };

    const toggleControls = () => {
        setShowControls(!showControls);
        // Auto-hide controls after 3 seconds when playing
        if (isPlaying && showControls) {
            setTimeout(() => setShowControls(false), 3000);
        }
    };

    if (error) {
        return (
            <View style={[styles.container, style, styles.errorContainer]}>
                <Ionicons name="warning" size={48} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => {
                        setError(null);
                        setIsLoading(true);
                        player.replace(videoUrl);
                    }}
                >
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            {title && <Text style={styles.title}>{title}</Text>}

            <View style={[styles.videoContainer, { height: videoHeight }]}>
                <VideoView
                    style={styles.video}
                    player={player}
                    allowsFullscreen
                    allowsPictureInPicture
                />

                {/* Loading Indicator */}
                {isLoading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#3B82F6" />
                    </View>
                )}

                {/* Touch overlay for controls */}
                <TouchableOpacity
                    style={styles.touchOverlay}
                    onPress={toggleControls}
                    activeOpacity={1}
                />

                {/* Controls Overlay */}
                {showControls && !isLoading && (
                    <View style={styles.controlsOverlay}>
                        {/* Top Controls */}
                        <View style={styles.topControls}>
                            <TouchableOpacity
                                style={styles.fullscreenButton}
                                onPress={handleFullscreen}
                            >
                                <Ionicons name="expand" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        {/* Center Controls */}
                        <View style={styles.centerControls}>
                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={handleBackward}
                            >
                                <Ionicons name="play-back" size={32} color="white" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.controlButton, styles.playButton]}
                                onPress={handlePlayPause}
                            >
                                <Ionicons
                                    name={isPlaying ? "pause" : "play"}
                                    size={40}
                                    color="white"
                                />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.controlButton}
                                onPress={handleForward}
                            >
                                <Ionicons name="play-forward" size={32} color="white" />
                            </TouchableOpacity>
                        </View>

                        {/* Bottom Controls */}
                        <View style={styles.bottomControls}>
                            {/* Progress Bar */}
                            <View style={styles.progressContainer}>
                                <Text style={styles.timeText}>
                                    {formatTime(currentTime)}
                                </Text>

                                <View style={styles.progressBarContainer}>
                                    <View style={styles.progressBarBackground} />
                                    <View
                                        style={[
                                            styles.progressBarFill,
                                            {
                                                width: duration > 0
                                                    ? `${(currentTime / duration) * 100}%`
                                                    : '0%',
                                            },
                                        ]}
                                    />
                                </View>

                                <Text style={styles.timeText}>
                                    {formatTime(duration)}
                                </Text>

                                <TouchableOpacity
                                    style={styles.muteButton}
                                    onPress={toggleMute}
                                >
                                    <Ionicons
                                        name={isMuted ? "volume-mute" : "volume-high"}
                                        size={20}
                                        color="white"
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#000',
        borderRadius: 12,
        overflow: 'hidden',
    },
    title: {
        color: '#F9FAFB',
        fontSize: 16,
        fontWeight: '600',
        padding: 12,
        backgroundColor: '#1F2937',
    },
    videoContainer: {
        position: 'relative',
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    touchOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'space-between',
        padding: 16,
    },
    topControls: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    centerControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 32,
    },
    bottomControls: {
        justifyContent: 'flex-end',
    },
    controlButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
    },
    fullscreenButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    timeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
        minWidth: 40,
        textAlign: 'center',
    },
    progressBarContainer: {
        flex: 1,
        height: 4,
        position: 'relative',
    },
    progressBarBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
    },
    progressBarFill: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        backgroundColor: '#3B82F6',
        borderRadius: 2,
    },
    muteButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        minHeight: 200,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default VideoPlayer;

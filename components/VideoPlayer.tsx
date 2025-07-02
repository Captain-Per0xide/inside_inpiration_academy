import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Video, { VideoRef } from 'react-native-video';

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
    const videoRef = useRef<VideoRef>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showControls, setShowControls] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPaused, setIsPaused] = useState(true);

    const { width } = Dimensions.get('window');
    const videoHeight = (width * 9) / 16; // 16:9 aspect ratio

    useEffect(() => {
        // Auto-hide controls after 3 seconds when playing
        if (showControls && !isPaused && !isLoading) {
            const timeout = setTimeout(() => {
                setShowControls(false);
            }, 3000);

            return () => clearTimeout(timeout);
        }
    }, [showControls, isPaused, isLoading]);

    const formatTime = (seconds: number) => {
        const totalSeconds = Math.floor(seconds);
        const minutes = Math.floor(totalSeconds / 60);
        const remainingSeconds = totalSeconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const handlePlayPause = () => {
        setIsPaused(!isPaused);
        setIsPlaying(!isPaused);
    };

    const handleSeek = (seekTime: number) => {
        if (duration > 0 && videoRef.current) {
            const newPosition = Math.max(0, Math.min(seekTime, duration));
            videoRef.current.seek(newPosition);
            setCurrentTime(newPosition);
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
        setIsMuted(!isMuted);
    };

    // Video event handlers for react-native-video
    const onLoad = (data: any) => {
        setDuration(data.duration);
        setIsLoading(false);
        setError(null);
    };

    const onProgress = (data: any) => {
        setCurrentTime(data.currentTime);
    };

    const onError = (error: any) => {
        console.error('Video Error:', error);
        setError('Failed to load video');
        setIsLoading(false);
    };

    const onLoadStart = () => {
        setIsLoading(true);
        setError(null);
    };

    const onEnd = () => {
        setIsPaused(true);
        setIsPlaying(false);
    };

    const handleFullscreen = async () => {
        try {
            if (!isFullscreen) {
                // Enter fullscreen - rotate to landscape
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                setIsFullscreen(true);
            } else {
                // Exit fullscreen - rotate back to portrait
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                setIsFullscreen(false);
            }
        } catch (error) {
            console.log('Error changing orientation:', error);
        }
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
                        // Force re-render by updating a key or state
                        setCurrentTime(0);
                    }}
                >
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <>
            <View style={[styles.container, style]}>
                {title && <Text style={styles.title}>{title}</Text>}

                <View style={[styles.videoContainer, { height: videoHeight }]}>
                    <Video
                        ref={videoRef}
                        source={{ uri: videoUrl }}
                        style={styles.video}
                        paused={isPaused}
                        muted={isMuted}
                        resizeMode="contain"
                        onLoad={onLoad}
                        onProgress={onProgress}
                        onError={onError}
                        onLoadStart={onLoadStart}
                        onEnd={onEnd}
                        controls={false}
                        poster={thumbnailUrl}
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
                                    <Ionicons
                                        name={isFullscreen ? "contract" : "expand"}
                                        size={24}
                                        color="white"
                                    />
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
                                        name={isPaused ? "play" : "pause"}
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

            {/* Fullscreen Modal */}
            <Modal
                visible={isFullscreen}
                animationType="fade"
                supportedOrientations={['landscape', 'portrait']}
                onRequestClose={handleFullscreen}
            >
                <StatusBar hidden />
                <View style={styles.fullscreenContainer}>
                    <Video
                        ref={videoRef}
                        source={{ uri: videoUrl }}
                        style={styles.fullscreenVideo}
                        paused={isPaused}
                        muted={isMuted}
                        resizeMode="contain"
                        onLoad={onLoad}
                        onProgress={onProgress}
                        onError={onError}
                        onLoadStart={onLoadStart}
                        onEnd={onEnd}
                        controls={false}
                        poster={thumbnailUrl}
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

                    {/* Fullscreen Controls Overlay */}
                    {showControls && !isLoading && (
                        <View style={styles.fullscreenControlsOverlay}>
                            {/* Top Controls */}
                            <View style={styles.fullscreenTopControls}>
                                <TouchableOpacity
                                    style={styles.fullscreenExitButton}
                                    onPress={handleFullscreen}
                                >
                                    <Ionicons name="close" size={28} color="white" />
                                </TouchableOpacity>
                                {title && (
                                    <Text style={styles.fullscreenTitle} numberOfLines={1}>
                                        {title}
                                    </Text>
                                )}
                                <View style={{ width: 40 }} />
                            </View>

                            {/* Center Controls */}
                            <View style={styles.fullscreenCenterControls}>
                                <TouchableOpacity
                                    style={styles.fullscreenControlButton}
                                    onPress={handleBackward}
                                >
                                    <Ionicons name="play-back" size={40} color="white" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.fullscreenControlButton, styles.fullscreenPlayButton]}
                                    onPress={handlePlayPause}
                                >
                                    <Ionicons
                                        name={isPaused ? "play" : "pause"}
                                        size={50}
                                        color="white"
                                    />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.fullscreenControlButton}
                                    onPress={handleForward}
                                >
                                    <Ionicons name="play-forward" size={40} color="white" />
                                </TouchableOpacity>
                            </View>

                            {/* Bottom Controls */}
                            <View style={styles.fullscreenBottomControls}>
                                <View style={styles.fullscreenProgressContainer}>
                                    <Text style={styles.fullscreenTimeText}>
                                        {formatTime(currentTime)}
                                    </Text>

                                    <View style={styles.fullscreenProgressBarContainer}>
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

                                    <Text style={styles.fullscreenTimeText}>
                                        {formatTime(duration)}
                                    </Text>

                                    <TouchableOpacity
                                        style={styles.fullscreenMuteButton}
                                        onPress={toggleMute}
                                    >
                                        <Ionicons
                                            name={isMuted ? "volume-mute" : "volume-high"}
                                            size={24}
                                            color="white"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </Modal>
        </>
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
    // Fullscreen styles
    fullscreenContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    fullscreenVideo: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    fullscreenControlsOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        flexDirection: 'column',
        justifyContent: 'space-between',
    },
    fullscreenTopControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    fullscreenExitButton: {
        padding: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 24,
    },
    fullscreenTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        marginHorizontal: 16,
        textAlign: 'center',
    },
    fullscreenCenterControls: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    fullscreenControlButton: {
        padding: 16,
        marginHorizontal: 30,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullscreenPlayButton: {
        padding: 20,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
    },
    fullscreenBottomControls: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    fullscreenProgressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
    fullscreenTimeText: {
        color: '#FFFFFF',
        fontSize: 14,
        minWidth: 50,
        textAlign: 'center',
    },
    fullscreenProgressBarContainer: {
        flex: 1,
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 3,
        marginHorizontal: 12,
        position: 'relative',
    },
    fullscreenMuteButton: {
        padding: 10,
        marginLeft: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 20,
    },
});

export default VideoPlayer;

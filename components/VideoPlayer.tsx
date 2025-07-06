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
import Video, { OnBufferData, OnPlaybackRateChangeData, VideoRef } from 'react-native-video';

interface VideoPlayerProps {
    videoUrl: string;
    thumbnailUrl?: string;
    title?: string;
    style?: any;
    // Streaming configuration
    bufferConfig?: {
        minBufferMs?: number;
        maxBufferMs?: number;
        bufferForPlaybackMs?: number;
        bufferForPlaybackAfterRebufferMs?: number;
    };
    // Adaptive streaming
    enableAdaptiveStreaming?: boolean;
    // Preload strategy
    preloadStrategy?: 'none' | 'metadata' | 'auto';
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
    videoUrl,
    thumbnailUrl,
    title,
    style,
    bufferConfig = {
        minBufferMs: 15000,      // 15 seconds minimum buffer
        maxBufferMs: 30000,      // 30 seconds maximum buffer
        bufferForPlaybackMs: 2500, // 2.5 seconds to start playback
        bufferForPlaybackAfterRebufferMs: 5000, // 5 seconds after rebuffering
    },
    enableAdaptiveStreaming = true,
    preloadStrategy = 'metadata',
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
    
    // Streaming-specific states
    const [isBuffering, setIsBuffering] = useState(false);
    const [bufferProgress, setBufferProgress] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [networkQuality, setNetworkQuality] = useState<'good' | 'poor' | 'unknown'>('unknown');
    const [downloadProgress, setDownloadProgress] = useState(0);
    
    // Playback speed states
    const [showSpeedOptions, setShowSpeedOptions] = useState(false);
    const playbackSpeeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

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

    const [progressBarWidth, setProgressBarWidth] = useState(0);
    const [fullscreenProgressBarWidth, setFullscreenProgressBarWidth] = useState(0);

    const handleProgressBarPress = (event: any) => {
        if (duration > 0 && progressBarWidth > 0) {
            const { locationX } = event.nativeEvent;
            
            // Calculate the touch position as a percentage
            const touchPercentage = Math.max(0, Math.min(1, locationX / progressBarWidth));
            const seekTime = touchPercentage * duration;
            
            handleSeek(seekTime);
        }
    };

    const handleFullscreenProgressBarPress = (event: any) => {
        if (duration > 0 && fullscreenProgressBarWidth > 0) {
            const { locationX } = event.nativeEvent;
            
            // Calculate the touch position as a percentage
            const touchPercentage = Math.max(0, Math.min(1, locationX / fullscreenProgressBarWidth));
            const seekTime = touchPercentage * duration;
            
            handleSeek(seekTime);
        }
    };

    const handleForward = () => {
        const newPosition = Math.min(currentTime + 10, duration);
        handleSeek(newPosition);
    };

    const handleBackward = () => {
        const newPosition = Math.max(currentTime - 10, 0);
        handleSeek(newPosition);
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };
    
    // Handle playback speed change
    const changePlaybackSpeed = (speed: number) => {
        setPlaybackRate(speed);
        setShowSpeedOptions(false);
    };
    
    // Toggle speed options menu
    const toggleSpeedOptions = () => {
        setShowSpeedOptions(!showSpeedOptions);
    };

    // Enhanced video event handlers with streaming support
    const onLoad = (data: any) => {
        setDuration(data.duration);
        setIsLoading(false);
        setError(null);
        console.log('Video loaded:', {
            duration: data.duration,
            canPlayFast: data.canPlayFast,
            canPlayReverse: data.canPlayReverse,
            canStepBackward: data.canStepBackward,
            canStepForward: data.canStepForward,
        });
    };

    const onProgress = (data: any) => {
        setCurrentTime(data.currentTime);
        setBufferProgress(data.playableDuration || 0);
        
        // Calculate download progress as percentage
        if (duration > 0) {
            setDownloadProgress((data.playableDuration || 0) / duration * 100);
        }
    };

    const onBuffer = (data: OnBufferData) => {
        setIsBuffering(data.isBuffering);
        console.log('Buffer status:', data.isBuffering ? 'Buffering...' : 'Buffer ready');
    };

    const onPlaybackRateChange = (data: OnPlaybackRateChangeData) => {
        setPlaybackRate(data.playbackRate);
        
        // Detect network quality based on playback rate changes
        if (data.playbackRate < 1.0) {
            setNetworkQuality('poor');
        } else if (data.playbackRate >= 1.0) {
            setNetworkQuality('good');
        }
    };

    const onError = (error: any) => {
        console.error('Video Error:', error);
        setError('Failed to load video');
        setIsLoading(false);
        setIsBuffering(false);
    };

    const onLoadStart = () => {
        setIsLoading(true);
        setError(null);
        setIsBuffering(false);
    };

    const onEnd = () => {
        setIsPaused(true);
        setIsPlaying(false);
    };

    const onReadyForDisplay = () => {
        console.log('Video is ready for display');
        setIsLoading(false);
    };

    const handleFullscreen = async () => {
        try {
            if (!isFullscreen) {
                // Enter fullscreen mode - lock to landscape for immersive experience
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                // Hide status bar for true fullscreen
                StatusBar.setHidden(true);
                setIsFullscreen(true);
            } else {
                // Exit fullscreen mode - return to portrait
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                // Show status bar again
                StatusBar.setHidden(false);
                setIsFullscreen(false);
            }
        } catch (error) {
            console.log('Error changing orientation:', error);
        }
    };

    const toggleControls = () => {
        setShowControls(!showControls);
        if (isPlaying && showControls) {
            setTimeout(() => setShowControls(false), 3000);
        }
    };

    // Get streaming quality indicator
    const getQualityIndicator = () => {
        if (networkQuality === 'poor') return { color: '#EF4444', text: 'Poor Connection' };
        if (networkQuality === 'good') return { color: '#10B981', text: 'Good Connection' };
        return { color: '#6B7280', text: 'Checking...' };
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
                        setCurrentTime(0);
                    }}
                >
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const renderBufferingIndicator = () => (
        <View style={styles.bufferingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.bufferingText}>Buffering...</Text>
            <View style={styles.bufferProgressBar}>
                <View 
                    style={[
                        styles.bufferProgressFill, 
                        { width: `${downloadProgress}%` }
                    ]} 
                />
            </View>
            <Text style={styles.bufferProgressText}>
                {downloadProgress.toFixed(1)}% loaded
            </Text>
        </View>
    );

    return (
        <>
            <View style={[styles.container, style]}>
                {title && <Text style={styles.title}>{title}</Text>}

                <View style={[styles.videoContainer, { height: videoHeight }]}>
                    <Video
                        ref={videoRef}
                        source={{ 
                            uri: videoUrl,
                            // Enhanced streaming configuration
                            type: 'mp4', // Specify video type for better optimization
                        }}
                        style={styles.video}
                        paused={isPaused}
                        muted={isMuted}
                        rate={playbackRate} // Set playback speed
                        resizeMode="contain"
                        onLoad={onLoad}
                        onProgress={onProgress}
                        onBuffer={onBuffer}
                        onPlaybackRateChange={onPlaybackRateChange}
                        onError={onError}
                        onLoadStart={onLoadStart}
                        onEnd={onEnd}
                        onReadyForDisplay={onReadyForDisplay}
                        controls={false}
                        poster={thumbnailUrl}
                        // Streaming optimizations
                        bufferConfig={bufferConfig}
                        maxBitRate={enableAdaptiveStreaming ? 0 : 2000000} // 0 = adaptive, or set max bitrate
                        progressUpdateInterval={250} // Update progress every 250ms
                        playInBackground={false}
                        playWhenInactive={false}
                        // Preload strategy (not supported by react-native-video)
                        // preload={preloadStrategy}
                    />

                    {/* Enhanced Loading/Buffering Indicator */}
                    {(isLoading || isBuffering) && (
                        <View style={styles.loadingOverlay}>
                            {renderBufferingIndicator()}
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
                            {/* Top Controls with streaming info */}
                            <View style={styles.topControls}>
                                <View style={styles.streamingInfo}>
                                    <View style={[styles.qualityIndicator, { backgroundColor: getQualityIndicator().color }]} />
                                    <Text style={styles.qualityText}>{getQualityIndicator().text}</Text>
                                </View>
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

                            {/* Bottom Controls with enhanced progress */}
                            <View style={styles.bottomControls}>
                                <View style={styles.progressContainer}>
                                    <Text style={styles.timeText}>
                                        {formatTime(currentTime)}
                                    </Text>

                                    <TouchableOpacity 
                                        style={styles.progressBarContainer}
                                        onPress={handleProgressBarPress}
                                        activeOpacity={1}
                                        onLayout={(event) => {
                                            const { width } = event.nativeEvent.layout;
                                            setProgressBarWidth(width);
                                        }}
                                    >
                                        {/* Background */}
                                        <View style={styles.progressBarBackground} />
                                        
                                        {/* Buffer progress */}
                                        <View
                                            style={[
                                                styles.bufferProgressBar,
                                                {
                                                    width: duration > 0
                                                        ? `${(bufferProgress / duration) * 100}%`
                                                        : '0%',
                                                },
                                            ]}
                                        />
                                        
                                        {/* Current progress */}
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
                                        
                                        {/* Progress indicator dot */}
                                        <View
                                            style={[
                                                styles.progressIndicator,
                                                {
                                                    left: duration > 0
                                                        ? `${(currentTime / duration) * 100}%`
                                                        : '0%',
                                                },
                                            ]}
                                        />
                                    </TouchableOpacity>

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
                                    
                                    {/* Playback Speed Control */}
                                    <TouchableOpacity
                                        style={styles.speedButton}
                                        onPress={toggleSpeedOptions}
                                    >
                                        <Text style={styles.speedButtonText}>{playbackRate}x</Text>
                                    </TouchableOpacity>
                                </View>
                                
                                {/* Speed Options Menu (shows when speed button is clicked) */}
                                {showSpeedOptions && (
                                    <View style={styles.speedOptionsContainer}>
                                        {playbackSpeeds.map(speed => (
                                            <TouchableOpacity
                                                key={`speed-${speed}`}
                                                style={[
                                                    styles.speedOption,
                                                    playbackRate === speed && styles.activeSpeedOption
                                                ]}
                                                onPress={() => changePlaybackSpeed(speed)}
                                            >
                                                <Text 
                                                    style={[
                                                        styles.speedOptionText,
                                                        playbackRate === speed && styles.activeSpeedOptionText
                                                    ]}
                                                >
                                                    {speed}x
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {/* Fullscreen Modal - Similar enhancements would be applied here */}
            <Modal
                visible={isFullscreen}
                animationType="fade"
                supportedOrientations={['landscape', 'portrait']}
                onRequestClose={handleFullscreen}
                statusBarTranslucent={true}
                presentationStyle="overFullScreen"
            >
                <StatusBar hidden translucent />
                <View style={styles.fullscreenContainer}>
                    <Video
                        ref={videoRef}
                        source={{ uri: videoUrl }}
                        style={styles.fullscreenVideo}
                        paused={isPaused}
                        muted={isMuted}
                        rate={playbackRate} // Set playback speed for fullscreen too
                        resizeMode="cover" // Changed from "contain" to "cover" to fill the screen
                        onLoad={onLoad}
                        onProgress={onProgress}
                        onBuffer={onBuffer}
                        onPlaybackRateChange={onPlaybackRateChange}
                        onError={onError}
                        onLoadStart={onLoadStart}
                        onEnd={onEnd}
                        onReadyForDisplay={onReadyForDisplay}
                        controls={false}
                        poster={thumbnailUrl}
                        bufferConfig={bufferConfig}
                        maxBitRate={enableAdaptiveStreaming ? 0 : 2000000}
                        progressUpdateInterval={250}
                    />

                    {/* Enhanced Loading/Buffering for fullscreen */}
                    {(isLoading || isBuffering) && (
                        <View style={styles.loadingOverlay}>
                            {renderBufferingIndicator()}
                        </View>
                    )}

                    {/* Touch overlay for controls */}
                    <TouchableOpacity
                        style={styles.touchOverlay}
                        onPress={toggleControls}
                        activeOpacity={1}
                    />

                    {/* Fullscreen Controls - Similar to regular controls */}
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
                                <View style={styles.streamingInfo}>
                                    <View style={[styles.qualityIndicator, { backgroundColor: getQualityIndicator().color }]} />
                                    <Text style={styles.qualityText}>{getQualityIndicator().text}</Text>
                                </View>
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

                                    <TouchableOpacity 
                                        style={styles.fullscreenProgressBarContainer}
                                        onPress={handleFullscreenProgressBarPress}
                                        activeOpacity={1}
                                        onLayout={(event) => {
                                            const { width } = event.nativeEvent.layout;
                                            setFullscreenProgressBarWidth(width);
                                        }}
                                    >
                                        <View style={styles.progressBarBackground} />
                                        <View
                                            style={[
                                                styles.bufferProgressBar,
                                                {
                                                    width: duration > 0
                                                        ? `${(bufferProgress / duration) * 100}%`
                                                        : '0%',
                                                },
                                            ]}
                                        />
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
                                        
                                        {/* Progress indicator dot for fullscreen */}
                                        <View
                                            style={[
                                                styles.fullscreenProgressIndicator,
                                                {
                                                    left: duration > 0
                                                        ? `${(currentTime / duration) * 100}%`
                                                        : '0%',
                                                },
                                            ]}
                                        />
                                    </TouchableOpacity>

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
                                    
                                    {/* Fullscreen Playback Speed Control */}
                                    <TouchableOpacity
                                        style={styles.fullscreenSpeedButton}
                                        onPress={toggleSpeedOptions}
                                    >
                                        <Text style={styles.fullscreenSpeedButtonText}>{playbackRate}x</Text>
                                    </TouchableOpacity>
                                </View>
                                
                                {/* Fullscreen Speed Options Menu */}
                                {showSpeedOptions && (
                                    <View style={styles.fullscreenSpeedOptionsContainer}>
                                        {playbackSpeeds.map(speed => (
                                            <TouchableOpacity
                                                key={`fullscreen-speed-${speed}`}
                                                style={[
                                                    styles.fullscreenSpeedOption,
                                                    playbackRate === speed && styles.fullscreenActiveSpeedOption
                                                ]}
                                                onPress={() => changePlaybackSpeed(speed)}
                                            >
                                                <Text 
                                                    style={[
                                                        styles.fullscreenSpeedOptionText,
                                                        playbackRate === speed && styles.fullscreenActiveSpeedOptionText
                                                    ]}
                                                >
                                                    {speed}x
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    bufferingContainer: {
        alignItems: 'center',
    },
    bufferingText: {
        color: 'white',
        fontSize: 16,
        marginTop: 12,
        marginBottom: 16,
    },
    bufferProgressBar: {
        position: 'absolute',
        top: 8,
        left: 0,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 2,
        zIndex: 1,
    },
    bufferProgressFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 2,
    },
    bufferProgressText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
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
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    streamingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    qualityIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    qualityText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
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
        height: 20, // Increased height for better touch target
        justifyContent: 'center',
        position: 'relative',
    },
    progressBarBackground: {
        position: 'absolute',
        top: 8,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
    },
    progressBarFill: {
        position: 'absolute',
        top: 8,
        left: 0,
        height: 4,
        backgroundColor: '#3B82F6',
        borderRadius: 2,
        zIndex: 2,
    },
    progressIndicator: {
        position: 'absolute',
        top: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#3B82F6',
        marginLeft: -6,
        zIndex: 3,
        borderWidth: 2,
        borderColor: 'white',
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
        position: 'relative', // Added positioning context for absolute positioned children
    },
    fullscreenVideo: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
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
        height: 24, // Increased height for better touch target in fullscreen
        justifyContent: 'center',
        marginHorizontal: 12,
        position: 'relative',
    },
    fullscreenMuteButton: {
        padding: 10,
        marginLeft: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 20,
    },
    fullscreenProgressIndicator: {
        position: 'absolute',
        top: -3,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#3B82F6',
        marginLeft: -6,
        zIndex: 3,
        borderWidth: 2,
        borderColor: 'white',
    },
    
    // Playback speed styles
    speedButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
        marginLeft: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    speedButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
    },
    speedOptionsContainer: {
        position: 'absolute',
        bottom: 60,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 12,
        padding: 8,
        flexDirection: 'column',
        zIndex: 100,
    },
    speedOption: {
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginVertical: 2,
    },
    activeSpeedOption: {
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
    },
    speedOptionText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
    activeSpeedOptionText: {
        fontWeight: '700',
    },
    
    // Fullscreen playback speed styles
    fullscreenSpeedButton: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        marginLeft: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    fullscreenSpeedButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    fullscreenSpeedOptionsContainer: {
        position: 'absolute',
        bottom: 80,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'column',
        zIndex: 100,
    },
    fullscreenSpeedOption: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 10,
        marginVertical: 2,
    },
    fullscreenActiveSpeedOption: {
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
    },
    fullscreenSpeedOptionText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
    fullscreenActiveSpeedOptionText: {
        fontWeight: '700',
    },
});

export default VideoPlayer;
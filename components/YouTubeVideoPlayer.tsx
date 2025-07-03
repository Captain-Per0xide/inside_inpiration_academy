import PDFViewer from "@/components/PDFViewer";
import VideoPlayer from "@/components/VideoPlayer";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

interface RecordedVideo {
    video_id: string;
    title: string;
    description?: string;
    video_url: string;
    thumbnail_url?: string;
    class_notes_url?: string;
    assignment_url?: string;
    created_at: string;
    uploaded_at: string;
    scheduled_class_id?: string;
    is_from_scheduled_class: boolean;
}

interface Comment {
    id: string;
    user_id: string;
    user_name: string;
    user_image?: string;
    comment_text: string;
    timestamp: string;
    likes: number;
    dislikes: number;
    userLikeStatus?: 'like' | 'dislike' | null;
    replies: Reply[];
}

interface Reply {
    id: string;
    user_id: string;
    user_name: string;
    user_image?: string;
    reply_text: string;
    timestamp: string;
    likes: number;
    dislikes: number;
    userLikeStatus?: 'like' | 'dislike' | null;
}

interface YouTubeVideoPlayerProps {
    video: RecordedVideo;
    courseId: string;
    courseName: string;
    onBack: () => void;
    suggestedVideos: RecordedVideo[];
    onVideoSelect: (video: RecordedVideo) => void;
}

const YouTubeVideoPlayer: React.FC<YouTubeVideoPlayerProps> = ({
    video,
    courseId,
    courseName,
    onBack,
    suggestedVideos,
    onVideoSelect,
}) => {
    const [screenData, setScreenData] = useState(Dimensions.get("window"));
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [newReply, setNewReply] = useState('');
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [showDescription, setShowDescription] = useState(false);
    const [activeTab, setActiveTab] = useState<'comments' | 'suggested'>('comments');
    const [selectedPDF, setSelectedPDF] = useState<{ url: string; title: string; type: 'notes' | 'assignment' } | null>(null);
    const [likingComments, setLikingComments] = useState<Set<string>>(new Set());

    const isLandscape = screenData.width > screenData.height;

    useEffect(() => {
        const onChange = (result: { window: any }) => {
            setScreenData(result.window);
        };

        const subscription = Dimensions.addEventListener("change", onChange);
        return () => subscription?.remove();
    }, []);

    useEffect(() => {
        getCurrentUser();
    }, []);

    useEffect(() => {
        fetchCommentsWithLikes();
    }, [video.video_id]);

    useEffect(() => {
        const handleOrientation = async () => {
            if (selectedPDF) {
                await ScreenOrientation.unlockAsync();
            } else {
                await ScreenOrientation.unlockAsync();
            }
        };
        handleOrientation();

        return () => {
            if (!selectedPDF) {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            }
        };
    }, [selectedPDF]);

    const getCurrentUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: userProfile } = await supabase
                    .from('users')
                    .select('id, name, user_image')
                    .eq('id', user.id)
                    .single();
                setCurrentUser(userProfile);
            }
        } catch (error) {
            console.error('Error getting current user:', error);
        }
    };

    const handleViewPDF = (url: string, title: string, type: 'notes' | 'assignment' = 'notes') => {
        if (!url) {
            Alert.alert("Error", "PDF URL not available");
            return;
        }
        setSelectedPDF({ url, title, type });
    };

    const handleBackFromPDF = () => {
        setSelectedPDF(null);
    };

    const handleLikeToggle = async (commentId: string, likeType: 'like' | 'dislike') => {
        if (!currentUser || likingComments.has(commentId)) return;

        try {
            setLikingComments(prev => new Set(prev).add(commentId));

            const { error } = await supabase.rpc('toggle_comment_like', {
                p_user_id: currentUser.id,
                p_comment_id: commentId,
                p_video_id: video.video_id,
                p_course_id: courseId,
                p_like_type: likeType
            });

            if (error) throw error;

            // Update the comments with new like counts
            await fetchCommentsWithLikes();

        } catch (error) {
            console.error('Error toggling like:', error);
            Alert.alert('Error', 'Failed to update like status');
        } finally {
            setLikingComments(prev => {
                const newSet = new Set(prev);
                newSet.delete(commentId);
                return newSet;
            });
        }
    };

    const fetchCommentsWithLikes = useCallback(async () => {
        try {
            setCommentsLoading(true);

            // Fetch comments
            const { data: commentsData, error: commentsError } = await supabase
                .from('video_comments')
                .select('comments')
                .eq('video_id', video.video_id)
                .eq('course_id', courseId)
                .single();

            if (commentsError && commentsError.code !== 'PGRST116') {
                throw commentsError;
            }

            const baseComments = commentsData?.comments || [];

            // Fetch like counts
            const { data: likeCounts, error: likeError } = await supabase.rpc('get_comment_like_counts', {
                p_video_id: video.video_id,
                p_course_id: courseId
            });

            if (likeError) {
                console.error('Error fetching like counts:', likeError);
            }

            // Fetch user's like status
            let userLikes: any[] = [];
            if (currentUser) {
                const { data: userLikesData, error: userLikesError } = await supabase
                    .from('comment_likes')
                    .select('comment_id, like_type')
                    .eq('user_id', currentUser.id)
                    .eq('video_id', video.video_id)
                    .eq('course_id', courseId);

                if (userLikesError) {
                    console.error('Error fetching user likes:', userLikesError);
                } else {
                    userLikes = userLikesData || [];
                }
            }

            // Merge comments with like data
            const commentsWithLikes = baseComments.map((comment: Comment) => {
                const likeData = likeCounts?.find((lc: any) => lc.comment_id === comment.id);
                const userLike = userLikes.find(ul => ul.comment_id === comment.id);

                const updatedReplies = comment.replies.map((reply: Reply) => {
                    const replyLikeData = likeCounts?.find((lc: any) => lc.comment_id === reply.id);
                    const userReplyLike = userLikes.find(ul => ul.comment_id === reply.id);

                    return {
                        ...reply,
                        likes: replyLikeData?.likes_count || 0,
                        dislikes: replyLikeData?.dislikes_count || 0,
                        userLikeStatus: userReplyLike?.like_type || null,
                    };
                });

                return {
                    ...comment,
                    likes: likeData?.likes_count || 0,
                    dislikes: likeData?.dislikes_count || 0,
                    userLikeStatus: userLike?.like_type || null,
                    replies: updatedReplies,
                };
            });

            setComments(commentsWithLikes);
        } catch (error) {
            console.error('Error fetching comments with likes:', error);
        } finally {
            setCommentsLoading(false);
        }
    }, [video.video_id, courseId, currentUser]);

    const submitComment = async () => {
        if (!newComment.trim() || !currentUser) {
            Alert.alert('Error', 'Please enter a comment');
            return;
        }

        try {
            setSubmittingComment(true);

            const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newCommentObj: Comment = {
                id: commentId,
                user_id: currentUser.id,
                user_name: currentUser.name,
                user_image: currentUser.user_image,
                comment_text: newComment.trim(),
                timestamp: new Date().toISOString(),
                likes: 0,
                dislikes: 0,
                userLikeStatus: null,
                replies: [],
            };

            const updatedComments = [newCommentObj, ...comments];

            // Check if video comments record exists
            const { data: existingRecord, error: fetchError } = await supabase
                .from('video_comments')
                .select('id')
                .eq('video_id', video.video_id)
                .eq('course_id', courseId)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                throw fetchError;
            }

            if (existingRecord) {
                // Update existing record
                const { error: updateError } = await supabase
                    .from('video_comments')
                    .update({ comments: updatedComments })
                    .eq('video_id', video.video_id)
                    .eq('course_id', courseId);

                if (updateError) throw updateError;
            } else {
                // Create new record
                const { error: insertError } = await supabase
                    .from('video_comments')
                    .insert({
                        video_id: video.video_id,
                        course_id: courseId,
                        comments: updatedComments,
                    });

                if (insertError) throw insertError;
            }

            setComments(updatedComments);
            setNewComment('');
        } catch (error) {
            console.error('Error submitting comment:', error);
            Alert.alert('Error', 'Failed to submit comment');
        } finally {
            setSubmittingComment(false);
        }
    };

    const submitReply = async (commentId: string) => {
        if (!newReply.trim() || !currentUser) {
            Alert.alert('Error', 'Please enter a reply');
            return;
        }

        try {
            const replyId = `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newReplyObj: Reply = {
                id: replyId,
                user_id: currentUser.id,
                user_name: currentUser.name,
                user_image: currentUser.user_image,
                reply_text: newReply.trim(),
                timestamp: new Date().toISOString(),
                likes: 0,
                dislikes: 0,
                userLikeStatus: null,
            };

            const updatedComments = comments.map(comment => {
                if (comment.id === commentId) {
                    return {
                        ...comment,
                        replies: [...comment.replies, newReplyObj],
                    };
                }
                return comment;
            });

            const { error } = await supabase
                .from('video_comments')
                .update({ comments: updatedComments })
                .eq('video_id', video.video_id)
                .eq('course_id', courseId);

            if (error) throw error;

            setComments(updatedComments);
            setNewReply('');
            setReplyingTo(null);
        } catch (error) {
            console.error('Error submitting reply:', error);
            Alert.alert('Error', 'Failed to submit reply');
        }
    };

    const formatTimeAgo = (timestamp: string) => {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
        return time.toLocaleDateString();
    };

    const formatDuration = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 60) return `${diffInMinutes} min`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hr`;
        return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''}`;
    };

    const renderPDFViewer = () => {
        if (!selectedPDF) return null;

        // Adjust header padding based on orientation
        const isLandscape = screenData.width > screenData.height;
        const headerPaddingTop = isLandscape ? 20 : 50;

        return (
            <SafeAreaView style={styles.pdfContainer}>
                <View style={[styles.pdfHeader, { paddingTop: headerPaddingTop }]}>
                    <TouchableOpacity onPress={handleBackFromPDF} style={styles.pdfBackButton}>
                        <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
                    </TouchableOpacity>
                    <Text style={styles.pdfTitle} numberOfLines={1}>
                        {selectedPDF.title}
                    </Text>
                    <View style={{ width: 24 }} />
                </View>

                <PDFViewer
                    url={selectedPDF.url}
                    onLoadComplete={(numberOfPages, filePath) => {
                        console.log(`PDF loaded. Pages: ${numberOfPages}`);
                    }}
                    onError={(error) => {
                        console.error('PDF load error: ', error);
                        Alert.alert('Error', 'Failed to load PDF. Please try again.');
                    }}
                />
            </SafeAreaView>
        );
    };

    const renderComment = (comment: Comment) => (
        <View key={comment.id} style={styles.commentContainer}>
            <View style={styles.commentHeader}>
                <Image
                    source={{ uri: comment.user_image || 'https://via.placeholder.com/40' }}
                    style={styles.userAvatar}
                />
                <View style={styles.commentContent}>
                    <View style={styles.commentMeta}>
                        <Text style={styles.userName}>{comment.user_name}</Text>
                        <Text style={styles.timestamp}>{formatTimeAgo(comment.timestamp)}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.comment_text}</Text>

                    <View style={styles.commentActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleLikeToggle(comment.id, 'like')}
                            disabled={likingComments.has(comment.id)}
                        >
                            <Ionicons
                                name={comment.userLikeStatus === 'like' ? "thumbs-up" : "thumbs-up-outline"}
                                size={16}
                                color={comment.userLikeStatus === 'like' ? "#3B82F6" : "#9CA3AF"}
                            />
                            <Text style={[styles.actionText, comment.userLikeStatus === 'like' && { color: "#3B82F6" }]}>
                                {comment.likes}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleLikeToggle(comment.id, 'dislike')}
                            disabled={likingComments.has(comment.id)}
                        >
                            <Ionicons
                                name={comment.userLikeStatus === 'dislike' ? "thumbs-down" : "thumbs-down-outline"}
                                size={16}
                                color={comment.userLikeStatus === 'dislike' ? "#EF4444" : "#9CA3AF"}
                            />
                            <Text style={[styles.actionText, comment.userLikeStatus === 'dislike' && { color: "#EF4444" }]}>
                                {comment.dislikes}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => setReplyingTo(comment.id)}
                        >
                            <Text style={styles.actionText}>Reply</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Replies */}
                    {comment.replies.length > 0 && (
                        <View style={styles.repliesContainer}>
                            {comment.replies.map(reply => (
                                <View key={reply.id} style={styles.replyContainer}>
                                    <Image
                                        source={{ uri: reply.user_image || 'https://via.placeholder.com/32' }}
                                        style={styles.replyAvatar}
                                    />
                                    <View style={styles.replyContent}>
                                        <View style={styles.replyMeta}>
                                            <Text style={styles.replyUserName}>{reply.user_name}</Text>
                                            <Text style={styles.replyTimestamp}>{formatTimeAgo(reply.timestamp)}</Text>
                                        </View>
                                        <Text style={styles.replyText}>{reply.reply_text}</Text>
                                        <View style={styles.replyActions}>
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleLikeToggle(reply.id, 'like')}
                                                disabled={likingComments.has(reply.id)}
                                            >
                                                <Ionicons
                                                    name={reply.userLikeStatus === 'like' ? "thumbs-up" : "thumbs-up-outline"}
                                                    size={14}
                                                    color={reply.userLikeStatus === 'like' ? "#3B82F6" : "#9CA3AF"}
                                                />
                                                <Text style={[styles.replyActionText, reply.userLikeStatus === 'like' && { color: "#3B82F6" }]}>
                                                    {reply.likes}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleLikeToggle(reply.id, 'dislike')}
                                                disabled={likingComments.has(reply.id)}
                                            >
                                                <Ionicons
                                                    name={reply.userLikeStatus === 'dislike' ? "thumbs-down" : "thumbs-down-outline"}
                                                    size={14}
                                                    color={reply.userLikeStatus === 'dislike' ? "#EF4444" : "#9CA3AF"}
                                                />
                                                <Text style={[styles.replyActionText, reply.userLikeStatus === 'dislike' && { color: "#EF4444" }]}>
                                                    {reply.dislikes}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Reply Input */}
                    {replyingTo === comment.id && (
                        <View style={styles.replyInputContainer}>
                            <Image
                                source={{ uri: currentUser?.user_image || 'https://via.placeholder.com/32' }}
                                style={styles.replyAvatar}
                            />
                            <View style={styles.replyInputWrapper}>
                                <TextInput
                                    style={styles.replyInput}
                                    value={newReply}
                                    onChangeText={setNewReply}
                                    placeholder="Add a reply..."
                                    placeholderTextColor="#9CA3AF"
                                    multiline
                                />
                                <View style={styles.replyInputActions}>
                                    <TouchableOpacity
                                        style={styles.cancelReplyButton}
                                        onPress={() => {
                                            setReplyingTo(null);
                                            setNewReply('');
                                        }}
                                    >
                                        <Text style={styles.cancelReplyText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.submitReplyButton, !newReply.trim() && styles.disabledButton]}
                                        onPress={() => submitReply(comment.id)}
                                        disabled={!newReply.trim()}
                                    >
                                        <Text style={styles.submitReplyText}>Reply</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );

    const renderSuggestedVideo = (suggestedVideo: RecordedVideo) => (
        <TouchableOpacity
            key={suggestedVideo.video_id}
            style={styles.suggestedVideoCard}
            onPress={() => onVideoSelect(suggestedVideo)}
            activeOpacity={0.7}
        >
            <View style={styles.suggestedVideoThumbnail}>
                <Image
                    source={{ uri: suggestedVideo.thumbnail_url || 'https://via.placeholder.com/160x90' }}
                    style={styles.thumbnailImage}
                />
                <View style={styles.videoDurationBadge}>
                    <Text style={styles.videoDurationText}>
                        {formatDuration(suggestedVideo.created_at)}
                    </Text>
                </View>
            </View>
            <View style={styles.suggestedVideoInfo}>
                <Text style={styles.suggestedVideoTitle} numberOfLines={2}>
                    {suggestedVideo.title}
                </Text>
                <Text style={styles.suggestedVideoMeta}>
                    {formatTimeAgo(suggestedVideo.uploaded_at || suggestedVideo.created_at)}
                </Text>
                {suggestedVideo.is_from_scheduled_class && (
                    <View style={styles.scheduledBadge}>
                        <Ionicons name="calendar" size={12} color="#10B981" />
                        <Text style={styles.scheduledBadgeText}>Scheduled</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    // If PDF is selected, show PDF viewer
    if (selectedPDF) {
        return renderPDFViewer();
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: isLandscape ? 20 : 50 }]}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>
                    {video.title}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            {isLandscape ? (
                // Landscape Layout
                <View style={styles.landscapeContainer}>
                    <View style={styles.videoSection}>
                        <VideoPlayer
                            videoUrl={video.video_url}
                            thumbnailUrl={video.thumbnail_url}
                            title={video.title}
                            style={styles.landscapeVideoPlayer}
                        />
                    </View>

                    <View style={styles.sidebarSection}>
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'comments' && styles.activeTab]}
                                onPress={() => setActiveTab('comments')}
                            >
                                <Text style={[styles.tabText, activeTab === 'comments' && styles.activeTabText]}>
                                    Comments ({comments.length})
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'suggested' && styles.activeTab]}
                                onPress={() => setActiveTab('suggested')}
                            >
                                <Text style={[styles.tabText, activeTab === 'suggested' && styles.activeTabText]}>
                                    More Videos
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
                            {activeTab === 'comments' ? (
                                <View style={styles.commentsSection}>
                                    {/* Comment Input */}
                                    {currentUser && (
                                        <View style={styles.commentInputContainer}>
                                            <Image
                                                source={{ uri: currentUser.user_image || 'https://via.placeholder.com/40' }}
                                                style={styles.userAvatar}
                                            />
                                            <View style={styles.commentInputWrapper}>
                                                <TextInput
                                                    style={styles.commentInput}
                                                    value={newComment}
                                                    onChangeText={setNewComment}
                                                    placeholder="Add a comment..."
                                                    placeholderTextColor="#9CA3AF"
                                                    multiline
                                                />
                                                <TouchableOpacity
                                                    style={[styles.submitButton, !newComment.trim() && styles.disabledButton]}
                                                    onPress={submitComment}
                                                    disabled={submittingComment || !newComment.trim()}
                                                >
                                                    {submittingComment ? (
                                                        <ActivityIndicator size="small" color="#fff" />
                                                    ) : (
                                                        <Text style={styles.submitButtonText}>Comment</Text>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}

                                    {/* Comments List */}
                                    {commentsLoading ? (
                                        <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 20 }} />
                                    ) : (
                                        comments.map(renderComment)
                                    )}
                                </View>
                            ) : (
                                <View style={styles.suggestedVideosSection}>
                                    {suggestedVideos.map(renderSuggestedVideo)}
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            ) : (
                // Portrait Layout
                <View style={styles.portraitContainer}>
                    {/* Video Player */}
                    <View style={styles.videoPlayerContainer}>
                        <VideoPlayer
                            videoUrl={video.video_url}
                            thumbnailUrl={video.thumbnail_url}
                            title={video.title}
                            style={styles.portraitVideoPlayer}
                        />
                    </View>

                    {/* Video Info */}
                    <View style={styles.videoInfoContainer}>
                        <Text style={styles.videoTitle}>{video.title}</Text>

                        <View style={styles.videoMetaContainer}>
                            <Text style={styles.videoMeta}>
                                {formatTimeAgo(video.uploaded_at || video.created_at)}
                            </Text>
                            {video.is_from_scheduled_class && (
                                <View style={styles.scheduledIndicator}>
                                    <Ionicons name="calendar" size={14} color="#10B981" />
                                    <Text style={styles.scheduledText}>Scheduled Class</Text>
                                </View>
                            )}
                        </View>

                        {/* Description */}
                        {video.description && (
                            <TouchableOpacity
                                style={styles.descriptionContainer}
                                onPress={() => setShowDescription(!showDescription)}
                                activeOpacity={0.7}
                            >
                                <Text
                                    style={styles.descriptionText}
                                    numberOfLines={showDescription ? undefined : 2}
                                >
                                    {video.description}
                                </Text>
                                <Text style={styles.showMoreText}>
                                    {showDescription ? 'Show less' : 'Show more'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {/* Resources */}
                        {(video.class_notes_url || video.assignment_url) && (
                            <View style={styles.resourcesContainer}>
                                <Text style={styles.resourcesTitle}>Resources</Text>
                                <View style={styles.resourcesList}>
                                    {video.class_notes_url && (
                                        <TouchableOpacity
                                            style={styles.resourceButton}
                                            onPress={() => handleViewPDF(video.class_notes_url!, 'Class Notes - ' + video.title, 'notes')}
                                        >
                                            <Ionicons name="document-text" size={20} color="#10B981" />
                                            <Text style={styles.resourceButtonText}>Class Notes</Text>
                                        </TouchableOpacity>
                                    )}
                                    {video.assignment_url && (
                                        <TouchableOpacity
                                            style={styles.resourceButton}
                                            onPress={() => handleViewPDF(video.assignment_url!, 'Assignment - ' + video.title, 'assignment')}
                                        >
                                            <Ionicons name="document" size={20} color="#F59E0B" />
                                            <Text style={styles.resourceButtonText}>Assignment</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'comments' && styles.activeTab]}
                            onPress={() => setActiveTab('comments')}
                        >
                            <Text style={[styles.tabText, activeTab === 'comments' && styles.activeTabText]}>
                                Comments ({comments.length})
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'suggested' && styles.activeTab]}
                            onPress={() => setActiveTab('suggested')}
                        >
                            <Text style={[styles.tabText, activeTab === 'suggested' && styles.activeTabText]}>
                                More Videos ({suggestedVideos.length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tab Content */}
                    <ScrollView style={styles.tabContentContainer} showsVerticalScrollIndicator={false}>
                        {activeTab === 'comments' ? (
                            <View style={styles.commentsSection}>
                                {/* Comment Input */}
                                {currentUser && (
                                    <View style={styles.commentInputContainer}>
                                        <Image
                                            source={{ uri: currentUser.user_image || 'https://via.placeholder.com/40' }}
                                            style={styles.userAvatar}
                                        />
                                        <View style={styles.commentInputWrapper}>
                                            <TextInput
                                                style={styles.commentInput}
                                                value={newComment}
                                                onChangeText={setNewComment}
                                                placeholder="Add a comment..."
                                                placeholderTextColor="#9CA3AF"
                                                multiline
                                            />
                                            <TouchableOpacity
                                                style={[styles.submitButton, !newComment.trim() && styles.disabledButton]}
                                                onPress={submitComment}
                                                disabled={submittingComment || !newComment.trim()}
                                            >
                                                {submittingComment ? (
                                                    <ActivityIndicator size="small" color="#fff" />
                                                ) : (
                                                    <Text style={styles.submitButtonText}>Comment</Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}

                                {/* Comments List */}
                                {commentsLoading ? (
                                    <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 20 }} />
                                ) : comments.length === 0 ? (
                                    <View style={styles.noCommentsContainer}>
                                        <Ionicons name="chatbubble-outline" size={48} color="#6B7280" />
                                        <Text style={styles.noCommentsText}>No comments yet</Text>
                                        <Text style={styles.noCommentsSubtext}>Be the first to share your thoughts!</Text>
                                    </View>
                                ) : (
                                    comments.map(renderComment)
                                )}
                            </View>
                        ) : (
                            <View style={styles.suggestedVideosSection}>
                                {suggestedVideos.length === 0 ? (
                                    <View style={styles.noSuggestionsContainer}>
                                        <Ionicons name="videocam-outline" size={48} color="#6B7280" />
                                        <Text style={styles.noSuggestionsText}>No more videos</Text>
                                        <Text style={styles.noSuggestionsSubtext}>Check back later for new content!</Text>
                                    </View>
                                ) : (
                                    suggestedVideos.map(renderSuggestedVideo)
                                )}
                            </View>
                        )}
                    </ScrollView>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1E293B',
        paddingHorizontal: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
    },
    backButton: {
        padding: 10,
        borderRadius: 12,
        backgroundColor: '#374151',
        borderWidth: 1,
        borderColor: '#4B5563',
    },
    headerTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#F9FAFB',
        textAlign: 'center',
        marginHorizontal: 16,
    },

    // PDF Viewer Styles
    pdfContainer: {
        flex: 1,
        backgroundColor: '#111827',
    },
    pdfHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#1F2937',
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    pdfBackButton: {
        padding: 10,
        borderRadius: 12,
        backgroundColor: '#374151',
        borderWidth: 1,
        borderColor: '#4B5563',
    },
    pdfTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: '#F9FAFB',
        textAlign: 'center',
        marginHorizontal: 16,
    },

    // Landscape Layout
    landscapeContainer: {
        flex: 1,
        flexDirection: 'row',
    },
    videoSection: {
        flex: 2,
        backgroundColor: '#000',
    },
    landscapeVideoPlayer: {
        flex: 1,
    },
    sidebarSection: {
        flex: 1,
        backgroundColor: '#1F2937',
        borderLeftWidth: 1,
        borderLeftColor: '#374151',
    },
    sidebarContent: {
        flex: 1,
    },
    portraitContainer: {
        flex: 1,
        backgroundColor: '#000',
    },

    videoPlayerContainer: {
        // Maintain 16:9 aspect rati
        height: 290, // Fixed height for portrait mode
    },
    portraitVideoPlayer: {
        flex: 1,
    },

    // Tab Content Container
    tabContentContainer: {
        
        backgroundColor: '#1F2937',
    },

    // Video Info
    videoInfoContainer: {
        backgroundColor: '#1F2937',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
         // Additional separation from video player
    },
    videoTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F9FAFB',
        marginBottom: 8,
        lineHeight: 24,
    },
    videoMetaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    videoMeta: {
        fontSize: 14,
        color: '#9CA3AF',
    },
    scheduledIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    scheduledText: {
        fontSize: 12,
        color: '#065F46',
        marginLeft: 4,
        fontWeight: '500',
    },

    // Description
    descriptionContainer: {
        marginBottom: 16,
    },
    descriptionText: {
        fontSize: 14,
        color: '#D1D5DB',
        lineHeight: 20,
        marginBottom: 4,
    },
    showMoreText: {
        fontSize: 14,
        color: '#3B82F6',
        fontWeight: '500',
    },

    // Resources
    resourcesContainer: {
        borderTopWidth: 1,
        borderTopColor: '#374151',
        paddingTop: 16,
    },
    resourcesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F9FAFB',
        marginBottom: 12,
    },
    resourcesList: {
        flexDirection: 'row',
        gap: 12,
    },
    resourceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#374151',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    resourceButtonText: {
        color: '#D1D5DB',
        fontSize: 14,
        fontWeight: '500',
    },

    // Tabs
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#1F2937',
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#3B82F6',
    },
    tabText: {
        fontSize: 14,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    activeTabText: {
        color: '#3B82F6',
        fontWeight: '600',
    },

    // Comments Section
    commentsSection: {
        backgroundColor: '#1F2937',
        padding: 16,
        minHeight: 400,
    },
    commentInputContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        gap: 12,
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#374151',
    },
    commentInputWrapper: {
        flex: 1,
    },
    commentInput: {
        borderWidth: 1,
        borderColor: '#4B5563',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#374151',
        color: '#F9FAFB',
        fontSize: 14,
        minHeight: 60,
        textAlignVertical: 'top',
        marginBottom: 8,
    },
    submitButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        alignSelf: 'flex-end',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },

    // Comments
    commentContainer: {
        marginBottom: 20,
    },
    commentHeader: {
        flexDirection: 'row',
        gap: 12,
    },
    commentContent: {
        flex: 1,
    },
    commentMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    userName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F9FAFB',
    },
    timestamp: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    commentText: {
        fontSize: 14,
        color: '#D1D5DB',
        lineHeight: 20,
        marginBottom: 8,
    },
    commentActions: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionText: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },

    // Replies
    repliesContainer: {
        marginLeft: 20,
        borderLeftWidth: 1,
        borderLeftColor: '#374151',
        paddingLeft: 16,
    },
    replyContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    replyAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#374151',
    },
    replyContent: {
        flex: 1,
    },
    replyMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    replyUserName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#F9FAFB',
    },
    replyTimestamp: {
        fontSize: 11,
        color: '#9CA3AF',
    },
    replyText: {
        fontSize: 13,
        color: '#D1D5DB',
        lineHeight: 18,
        marginBottom: 6,
    },
    replyActions: {
        flexDirection: 'row',
        gap: 12,
    },
    replyActionText: {
        fontSize: 11,
        color: '#9CA3AF',
        fontWeight: '500',
    },

    // Reply Input
    replyInputContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    replyInputWrapper: {
        flex: 1,
    },
    replyInput: {
        borderWidth: 1,
        borderColor: '#4B5563',
        borderRadius: 6,
        padding: 8,
        backgroundColor: '#374151',
        color: '#F9FAFB',
        fontSize: 13,
        minHeight: 40,
        textAlignVertical: 'top',
        marginBottom: 6,
    },
    replyInputActions: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'flex-end',
    },
    cancelReplyButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    cancelReplyText: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    submitReplyButton: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    submitReplyText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },

    // No Comments
    noCommentsContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    noCommentsText: {
        fontSize: 16,
        color: '#9CA3AF',
        fontWeight: '500',
        marginTop: 12,
    },
    noCommentsSubtext: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },

    // Suggested Videos
    suggestedVideosSection: {
        backgroundColor: '#1F2937',
        padding: 16,
    },
    suggestedVideoCard: {
        flexDirection: 'row',
        marginBottom: 16,
        backgroundColor: '#374151',
        borderRadius: 8,
        overflow: 'hidden',
    },
    suggestedVideoThumbnail: {
        position: 'relative',
    },
    thumbnailImage: {
        width: 160,
        height: 90,
        backgroundColor: '#4B5563',
    },
    videoDurationBadge: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
    },
    videoDurationText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '500',
    },
    suggestedVideoInfo: {
        flex: 1,
        padding: 12,
        justifyContent: 'space-between',
    },
    suggestedVideoTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F9FAFB',
        lineHeight: 18,
        marginBottom: 4,
    },
    suggestedVideoMeta: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 4,
    },
    scheduledBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D1FAE5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    scheduledBadgeText: {
        fontSize: 10,
        color: '#065F46',
        marginLeft: 2,
        fontWeight: '500',
    },

    // No Suggestions
    noSuggestionsContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    noSuggestionsText: {
        fontSize: 16,
        color: '#9CA3AF',
        fontWeight: '500',
        marginTop: 12,
    },
    noSuggestionsSubtext: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
});

export default YouTubeVideoPlayer;

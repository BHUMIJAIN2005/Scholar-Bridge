package com.scholarbridge.service;

import com.scholarbridge.dto.ApiDtos.BlogAttachmentResponse;
import com.scholarbridge.dto.ApiDtos.BlogCommentRequest;
import com.scholarbridge.dto.ApiDtos.BlogCommentResponse;
import com.scholarbridge.dto.ApiDtos.BlogCommentUpdateRequest;
import com.scholarbridge.dto.ApiDtos.BlogPaperResponse;
import com.scholarbridge.dto.ApiDtos.BlogPostRequest;
import com.scholarbridge.dto.ApiDtos.BlogPostResponse;
import com.scholarbridge.dto.ApiDtos.BlogPostSummaryResponse;
import com.scholarbridge.dto.ApiDtos.BlogReactionRequest;
import com.scholarbridge.dto.ApiDtos.BlogTagResponse;
import com.scholarbridge.entity.BlogAttachment;
import com.scholarbridge.entity.BlogComment;
import com.scholarbridge.entity.BlogPost;
import com.scholarbridge.entity.BlogPostStatus;
import com.scholarbridge.entity.BlogReaction;
import com.scholarbridge.entity.BlogReactionType;
import com.scholarbridge.entity.BlogTag;
import com.scholarbridge.entity.CommentLike;
import com.scholarbridge.entity.PaperSubmission;
import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.exception.BusinessRuleException;
import com.scholarbridge.exception.ResourceNotFoundException;
import com.scholarbridge.repository.BlogAttachmentRepository;
import com.scholarbridge.repository.BlogCommentRepository;
import com.scholarbridge.repository.BlogPostRepository;
import com.scholarbridge.repository.BlogReactionRepository;
import com.scholarbridge.repository.BlogTagRepository;
import com.scholarbridge.repository.CommentLikeRepository;
import com.scholarbridge.repository.PaperSubmissionRepository;
import com.scholarbridge.security.CurrentUserService;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class BlogService {
    private static final int PAGE_SIZE = 10;
    private static final long MAX_ATTACHMENT_SIZE = 10L * 1024 * 1024;
    private static final Logger logger = LoggerFactory.getLogger(BlogService.class);

    private final BlogPostRepository posts;
    private final BlogTagRepository tags;
    private final BlogAttachmentRepository attachments;
    private final BlogCommentRepository comments;
    private final BlogReactionRepository reactions;
    private final CommentLikeRepository commentLikes;
    private final PaperSubmissionRepository papers;
    private final CurrentUserService currentUser;
    private final java.nio.file.Path uploadDirectory;

    public BlogService(
        BlogPostRepository posts,
        BlogTagRepository tags,
        BlogAttachmentRepository attachments,
        BlogCommentRepository comments,
        BlogReactionRepository reactions,
        CommentLikeRepository commentLikes,
        PaperSubmissionRepository papers,
        CurrentUserService currentUser,
        @Value("${app.uploads.directory}") String uploadDirectory
    ) {
        this.posts = posts;
        this.tags = tags;
        this.attachments = attachments;
        this.comments = comments;
        this.reactions = reactions;
        this.commentLikes = commentLikes;
        this.papers = papers;
        this.currentUser = currentUser;
        this.uploadDirectory = java.nio.file.Paths.get(uploadDirectory).toAbsolutePath().normalize().resolve("blog");
    }

    @Transactional
    public BlogPostResponse createPost(BlogPostRequest request) {
        User author = currentUser.requireUser();
        BlogPost post = new BlogPost();
        post.setAuthor(author);
        applyPostRequest(post, request, true);
        return toPostResponse(posts.save(post), author.getId());
    }

    @Transactional(readOnly = true)
    public Page<BlogPostSummaryResponse> getFeed(int page, String tag, UserRole authorRole, String query) {
        currentUser.requireUser();
        String normalizedTag = normalizeFilter(tag);
        String normalizedQuery = normalizeFilter(query);
        PageRequest pageable = PageRequest.of(page, PAGE_SIZE, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Long> ids = posts.findPostIds(BlogPostStatus.PUBLISHED, normalizedTag, authorRole, normalizedQuery, pageable);
        Map<Long, BlogPost> loaded = posts.findByIdIn(ids.getContent()).stream()
            .collect(Collectors.toMap(BlogPost::getId, post -> post));
        List<BlogPostSummaryResponse> content = ids.getContent().stream()
            .map(loaded::get)
            .filter(java.util.Objects::nonNull)
            .map(this::toSummaryResponse)
            .toList();
        return new PageImpl<>(content, pageable, ids.getTotalElements());
    }

    @Transactional(readOnly = true)
    public BlogPostResponse getPost(Long id) {
        User user = currentUser.requireUser();
        BlogPost post = findDetailedPost(id);
        if (post.getStatus() == BlogPostStatus.DRAFT && !post.getAuthor().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Blog post was not found.");
        }
        return toPostResponse(post, user.getId());
    }

    @Transactional
    public BlogPostResponse updatePost(Long id, BlogPostRequest request) {
        User user = currentUser.requireUser();
        BlogPost post = findDetailedPost(id);
        requirePostAuthor(post, user);
        applyPostRequest(post, request, false);
        return toPostResponse(posts.save(post), user.getId());
    }

    @Transactional
    public void deletePost(Long id) {
        User user = currentUser.requireUser();
        BlogPost post = findDetailedPost(id);
        requirePostAuthor(post, user);
        for (BlogAttachment attachment : attachments.findByPostId(id)) {
            deleteStoredFile(attachment.getStoredFileName());
        }
        posts.delete(post);
    }

    @Transactional(readOnly = true)
    public List<BlogPostSummaryResponse> getMyPosts() {
        User user = currentUser.requireUser();
        return posts.findByAuthorIdOrderByUpdatedAtDesc(user.getId()).stream()
            .map(this::toSummaryResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<BlogPostSummaryResponse> getPublishedPostsForAuthor(Long authorId) {
        return posts.findByAuthorIdAndStatusOrderByUpdatedAtDesc(authorId, BlogPostStatus.PUBLISHED).stream()
            .map(this::toSummaryResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    public List<BlogTagResponse> getPopularTags() {
        currentUser.requireUser();
        return posts.findPopularTags(BlogPostStatus.PUBLISHED, PageRequest.of(0, 20)).stream()
            .map(tag -> new BlogTagResponse(tag.getName(), tag.getPostCount()))
            .toList();
    }

    @Transactional
    public BlogAttachmentResponse uploadAttachment(Long postId, MultipartFile file) {
        User user = currentUser.requireUser();
        BlogPost post = posts.findForUpdateById(postId)
            .orElseThrow(() -> new ResourceNotFoundException("Blog post was not found."));
        requirePostAuthor(post, user);
        if (file == null || file.isEmpty()) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Choose a non-empty PDF file.");
        }
        if (file.getSize() > MAX_ATTACHMENT_SIZE) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Each PDF must be no larger than 10 MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null
            || !MediaType.APPLICATION_PDF.toString().equalsIgnoreCase(contentType.split(";", 2)[0].trim())) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Upload a file with the application/pdf content type.");
        }
        if (attachments.countByPostId(postId) >= 3) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "A post can have at most 3 PDF attachments.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException exception) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "The PDF could not be read.");
        }
        if (!hasPdfSignature(bytes)) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "The uploaded file is not a valid PDF.");
        }

        String originalFileName = safeOriginalFileName(file.getOriginalFilename());
        String storedFileName = UUID.randomUUID() + ".pdf";
        java.nio.file.Path destination = resolveStoredFile(storedFileName);
        try {
            Files.createDirectories(uploadDirectory);
            Files.write(destination, bytes, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
        } catch (IOException exception) {
            throw new BusinessRuleException(HttpStatus.INTERNAL_SERVER_ERROR, "The PDF could not be stored.");
        }

        BlogAttachment attachment = new BlogAttachment();
        attachment.setPost(post);
        attachment.setOriginalFileName(originalFileName);
        attachment.setStoredFileName(storedFileName);
        attachment.setFileSize(bytes.length);
        try {
            return toAttachmentResponse(attachments.save(attachment));
        } catch (DataAccessException exception) {
            removeStoredFileAfterFailure(destination);
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public DownloadedBlogAttachment getAttachment(Long attachmentId) {
        User user = currentUser.requireUser();
        BlogAttachment attachment = attachments.findDetailedById(attachmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Blog attachment was not found."));
        if (attachment.getPost().getStatus() == BlogPostStatus.DRAFT
            && !attachment.getPost().getAuthor().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Blog attachment was not found.");
        }
        java.nio.file.Path path = resolveStoredFile(attachment.getStoredFileName());
        if (!Files.isRegularFile(path)) {
            throw new ResourceNotFoundException("The blog attachment is no longer available.");
        }
        return new DownloadedBlogAttachment(new FileSystemResource(path), attachment.getOriginalFileName());
    }

    @Transactional
    public void deleteAttachment(Long attachmentId) {
        User user = currentUser.requireUser();
        BlogAttachment attachment = attachments.findById(attachmentId)
            .orElseThrow(() -> new ResourceNotFoundException("Blog attachment was not found."));
        requirePostAuthor(attachment.getPost(), user);
        deleteStoredFile(attachment.getStoredFileName());
        attachments.delete(attachment);
    }

    @Transactional
    public BlogPostResponse setReaction(Long postId, BlogReactionRequest request) {
        User user = currentUser.requireUser();
        BlogPost post = requirePublishedPost(postId);
        BlogReactionType requestedType = request == null ? null : request.type();
        BlogReaction existing = reactions.findByPostIdAndUserId(postId, user.getId()).orElse(null);
        if (existing != null && (requestedType == null || existing.getType() == requestedType)) {
            reactions.delete(existing);
        } else if (requestedType != null && existing != null) {
            existing.setType(requestedType);
            reactions.save(existing);
        } else if (requestedType != null) {
            BlogReaction reaction = new BlogReaction();
            reaction.setPost(post);
            reaction.setUser(user);
            reaction.setType(requestedType);
            reactions.save(reaction);
        }
        return toPostResponse(post, user.getId());
    }

    @Transactional(readOnly = true)
    public List<BlogCommentResponse> getComments(Long postId) {
        User user = currentUser.requireUser();
        requirePublishedPost(postId);
        List<BlogComment> postComments = comments.findByPostIdOrderByCreatedAtAsc(postId);
        if (postComments.isEmpty()) {
            return List.of();
        }

        List<Long> commentIds = postComments.stream().map(BlogComment::getId).toList();
        Map<Long, Long> likeCounts = commentLikes.countByCommentIds(commentIds).stream()
            .collect(Collectors.toMap(CommentLikeRepository.CommentCount::getCommentId,
                CommentLikeRepository.CommentCount::getLikeCount));
        Set<Long> likedCommentIds = commentLikes.findByCommentIdInAndUserId(commentIds, user.getId()).stream()
            .map(like -> like.getComment().getId())
            .collect(Collectors.toSet());
        Map<Long, List<BlogComment>> repliesByParent = postComments.stream()
            .filter(comment -> comment.getParentComment() != null)
            .collect(Collectors.groupingBy(comment -> comment.getParentComment().getId()));

        return postComments.stream()
            .filter(comment -> comment.getParentComment() == null)
            .map(comment -> toCommentResponse(
                comment, repliesByParent.getOrDefault(comment.getId(), List.of()), likeCounts, likedCommentIds))
            .toList();
    }

    @Transactional
    public BlogCommentResponse createComment(Long postId, BlogCommentRequest request) {
        User user = currentUser.requireUser();
        BlogPost post = requirePublishedPost(postId);
        BlogComment parent = null;
        if (request.parentCommentId() != null) {
            parent = comments.findDetailedById(request.parentCommentId())
                .orElseThrow(() -> new ResourceNotFoundException("Parent comment was not found."));
            if (!parent.getPost().getId().equals(postId)) {
                throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "The parent comment belongs to another post.");
            }
            if (parent.getParentComment() != null) {
                throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "Replies to replies are not allowed.");
            }
        }

        BlogComment comment = new BlogComment();
        comment.setPost(post);
        comment.setAuthor(user);
        comment.setParentComment(parent);
        comment.setContent(request.content());
        BlogComment saved = comments.save(comment);
        return toCommentResponse(saved, List.of(), Map.of(), Set.of());
    }

    @Transactional
    public BlogCommentResponse updateComment(Long commentId, BlogCommentUpdateRequest request) {
        User user = currentUser.requireUser();
        BlogComment comment = findDetailedComment(commentId);
        requirePublishedPost(comment.getPost().getId());
        if (!comment.getAuthor().getId().equals(user.getId())) {
            throw new BusinessRuleException(HttpStatus.FORBIDDEN, "You can only edit your own comments.");
        }
        comment.setContent(request.content());
        comment.setUpdatedAt(Instant.now());
        return toCommentResponse(comments.save(comment), List.of(), Map.of(), Set.of());
    }

    @Transactional
    public void deleteComment(Long commentId) {
        User user = currentUser.requireUser();
        BlogComment comment = findDetailedComment(commentId);
        boolean isCommentAuthor = comment.getAuthor().getId().equals(user.getId());
        boolean isPostAuthor = comment.getPost().getAuthor().getId().equals(user.getId());
        if (!isCommentAuthor && !isPostAuthor) {
            throw new BusinessRuleException(HttpStatus.FORBIDDEN, "You cannot delete this comment.");
        }
        comments.delete(comment);
    }

    @Transactional
    public boolean toggleCommentLike(Long commentId) {
        User user = currentUser.requireUser();
        BlogComment comment = findDetailedComment(commentId);
        requirePublishedPost(comment.getPost().getId());
        CommentLike existing = commentLikes.findByCommentIdAndUserId(commentId, user.getId()).orElse(null);
        if (existing == null) {
            CommentLike like = new CommentLike();
            like.setComment(comment);
            like.setUser(user);
            commentLikes.save(like);
            return true;
        }
        commentLikes.delete(existing);
        return false;
    }

    private void applyPostRequest(BlogPost post, BlogPostRequest request, boolean creating) {
        post.setTitle(request.title().trim());
        post.setContent(request.content());
        post.setSummary(request.summary() == null || request.summary().isBlank()
            ? request.content().substring(0, Math.min(200, request.content().length()))
            : request.summary().trim());
        if (request.status() != null || creating) {
            post.setStatus(request.status() == null ? BlogPostStatus.DRAFT : request.status());
        }
        post.setLinkedPaper(resolveLinkedPaper(request.linkedPaperId(), post.getAuthor()));
        post.setTags(resolveTags(request.tags()));
    }

    private PaperSubmission resolveLinkedPaper(Long paperId, User user) {
        if (paperId == null) {
            return null;
        }
        PaperSubmission paper = papers.findById(paperId)
            .orElseThrow(() -> new ResourceNotFoundException("Paper was not found."));
        if (!paper.getStudent().getId().equals(user.getId())) {
            throw new BusinessRuleException(HttpStatus.FORBIDDEN, "You can only link one of your own papers.");
        }
        return paper;
    }

    private List<BlogTag> resolveTags(List<String> requestedTags) {
        if (requestedTags == null || requestedTags.isEmpty()) {
            return new ArrayList<>();
        }
        Set<String> names = requestedTags.stream()
            .map(name -> name.trim().toLowerCase(Locale.ROOT))
            .collect(Collectors.toCollection(LinkedHashSet::new));
        if (names.size() > 5) {
            throw new BusinessRuleException(HttpStatus.BAD_REQUEST, "A post can have at most 5 tags.");
        }

        Map<String, BlogTag> existing = tags.findByNameIn(names).stream()
            .collect(Collectors.toMap(BlogTag::getName, tag -> tag));
        List<BlogTag> resolved = new ArrayList<>();
        for (String name : names) {
            BlogTag tag = existing.get(name);
            if (tag == null) {
                tag = new BlogTag();
                tag.setName(name);
                tag = tags.save(tag);
            }
            resolved.add(tag);
        }
        return resolved;
    }

    private BlogPost findDetailedPost(Long id) {
        return posts.findDetailedById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Blog post was not found."));
    }

    private BlogComment findDetailedComment(Long id) {
        return comments.findDetailedById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Blog comment was not found."));
    }

    private BlogPost requirePublishedPost(Long id) {
        BlogPost post = findDetailedPost(id);
        if (post.getStatus() != BlogPostStatus.PUBLISHED) {
            throw new ResourceNotFoundException("Blog post was not found.");
        }
        return post;
    }

    private void requirePostAuthor(BlogPost post, User user) {
        if (!post.getAuthor().getId().equals(user.getId())) {
            throw new BusinessRuleException(HttpStatus.FORBIDDEN, "You can only manage your own blog posts.");
        }
    }

    private String normalizeFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private BlogPostSummaryResponse toSummaryResponse(BlogPost post) {
        return new BlogPostSummaryResponse(
            post.getId(),
            post.getAuthor().getName(),
            post.getAuthor().getRole(),
            post.getTitle(),
            post.getSummary(),
            post.getStatus(),
            toPaperResponse(post.getLinkedPaper()),
            post.getTags().stream().map(BlogTag::getName).sorted().toList(),
            post.getCreatedAt(),
            post.getUpdatedAt()
        );
    }

    private BlogPostResponse toPostResponse(BlogPost post, Long userId) {
        Map<BlogReactionType, Long> counts = new EnumMap<>(BlogReactionType.class);
        for (BlogReactionType type : BlogReactionType.values()) {
            counts.put(type, 0L);
        }

        reactions.countByPostIds(List.of(post.getId())).forEach(count -> counts.put(count.getType(), count.getReactionCount()));
        BlogReactionType currentReaction = reactions.findByPostIdAndUserId(post.getId(), userId)
            .map(reaction -> reaction.getType())
            .orElse(null);
        List<BlogAttachmentResponse> attachmentResponses = attachments.findByPostId(post.getId()).stream()
            .map(this::toAttachmentResponse)
            .toList();
        return new BlogPostResponse(
            post.getId(),
            post.getAuthor().getId(),
            post.getAuthor().getName(),
            post.getAuthor().getRole(),
            post.getTitle(),
            post.getSummary(),
            post.getContent(),
            post.getStatus(),
            toPaperResponse(post.getLinkedPaper()),
            post.getTags().stream().map(BlogTag::getName).sorted().toList(),
            attachmentResponses,
            counts,
            currentReaction,
            post.getCreatedAt(),
            post.getUpdatedAt()
        );
    }

    private BlogCommentResponse toCommentResponse(
        BlogComment comment,
        List<BlogComment> replies,
        Map<Long, Long> likeCounts,
        Set<Long> likedCommentIds
    ) {
        return new BlogCommentResponse(
            comment.getId(),
            comment.getAuthor().getId(),
            comment.getAuthor().getName(),
            comment.getAuthor().getRole(),
            comment.getContent(),
            comment.getCreatedAt(),
            comment.getUpdatedAt(),
            likeCounts.getOrDefault(comment.getId(), 0L),
            likedCommentIds.contains(comment.getId()),
            replies.stream()
                .map(reply -> toCommentResponse(reply, List.of(), likeCounts, likedCommentIds))
                .toList()
        );
    }

    private BlogPaperResponse toPaperResponse(PaperSubmission paper) {
        return paper == null ? null : new BlogPaperResponse(paper.getId(), paper.getTitle(), paper.getCategory());
    }

    private BlogAttachmentResponse toAttachmentResponse(com.scholarbridge.entity.BlogAttachment attachment) {
        return new BlogAttachmentResponse(
            attachment.getId(),
            attachment.getOriginalFileName(),
            attachment.getFileSize(),
            attachment.getUploadedAt(),
            "/api/blogs/attachments/" + attachment.getId()
        );
    }

    private boolean hasPdfSignature(byte[] bytes) {
        return bytes.length >= 4
            && new String(bytes, 0, 4, StandardCharsets.US_ASCII).equals("%PDF");
    }

    private String safeOriginalFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "document.pdf";
        }
        String normalized = fileName.replace('\\', '/');
        String safeName = normalized.substring(normalized.lastIndexOf('/') + 1).trim();
        return safeName.isBlank() ? "document.pdf" : safeName;
    }

    private java.nio.file.Path resolveStoredFile(String storedFileName) {
        java.nio.file.Path path = uploadDirectory.resolve(storedFileName).normalize();
        if (!path.startsWith(uploadDirectory)) {
            throw new ResourceNotFoundException("The blog attachment was not found.");
        }
        return path;
    }

    private void deleteStoredFile(String storedFileName) {
        try {
            Files.deleteIfExists(resolveStoredFile(storedFileName));
        } catch (IOException exception) {
            throw new BusinessRuleException(HttpStatus.INTERNAL_SERVER_ERROR, "The stored PDF could not be deleted.");
        }
    }

    private void removeStoredFileAfterFailure(java.nio.file.Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (IOException exception) {
            logger.error("Could not remove unreferenced blog attachment file {}", path, exception);
        }
    }

    public record DownloadedBlogAttachment(Resource resource, String filename) {
        public HttpHeaders headers() {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDisposition(ContentDisposition.inline().filename(filename).build());
            return headers;
        }
    }
}

package com.scholarbridge.controller;

import com.scholarbridge.dto.ApiDtos.BlogAttachmentResponse;
import com.scholarbridge.dto.ApiDtos.BlogCommentRequest;
import com.scholarbridge.dto.ApiDtos.BlogCommentResponse;
import com.scholarbridge.dto.ApiDtos.BlogCommentUpdateRequest;
import com.scholarbridge.dto.ApiDtos.BlogPostRequest;
import com.scholarbridge.dto.ApiDtos.BlogPostResponse;
import com.scholarbridge.dto.ApiDtos.BlogReactionRequest;
import com.scholarbridge.dto.ApiDtos.BlogPostSummaryResponse;
import com.scholarbridge.dto.ApiDtos.BlogTagResponse;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.service.BlogService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Validated
@RestController
@RequestMapping("/api/blogs")
public class BlogController {
    private final BlogService blogService;

    public BlogController(BlogService blogService) {
        this.blogService = blogService;
    }

    @PostMapping
    public BlogPostResponse create(@Valid @RequestBody BlogPostRequest request) {
        return blogService.createPost(request);
    }

    @GetMapping
    public Page<BlogPostSummaryResponse> feed(
        @RequestParam(defaultValue = "0") @Min(0) int page,
        @RequestParam(required = false) String tag,
        @RequestParam(required = false) UserRole authorRole,
        @RequestParam(required = false, name = "q") String query
    ) {
        return blogService.getFeed(page, tag, authorRole, query);
    }

    @GetMapping("/my")
    public List<BlogPostSummaryResponse> mine() {
        return blogService.getMyPosts();
    }

    @GetMapping("/tags")
    public List<BlogTagResponse> tags() {
        return blogService.getPopularTags();
    }

    @GetMapping("/{id}")
    public BlogPostResponse get(@PathVariable Long id) {
        return blogService.getPost(id);
    }

    @PutMapping("/{id}")
    public BlogPostResponse update(@PathVariable Long id, @Valid @RequestBody BlogPostRequest request) {
        return blogService.updatePost(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        blogService.deletePost(id);
    }

    @PostMapping(value = "/{id}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public BlogAttachmentResponse uploadAttachment(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return blogService.uploadAttachment(id, file);
    }

    @GetMapping("/attachments/{attachmentId}")
    public ResponseEntity<Resource> getAttachment(@PathVariable Long attachmentId) {
        BlogService.DownloadedBlogAttachment attachment = blogService.getAttachment(attachmentId);
        return ResponseEntity.ok().headers(attachment.headers()).body(attachment.resource());
    }

    @DeleteMapping("/attachments/{attachmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAttachment(@PathVariable Long attachmentId) {
        blogService.deleteAttachment(attachmentId);
    }

    @PutMapping("/{id}/reaction")
    public BlogPostResponse setReaction(
        @PathVariable Long id,
        @RequestBody(required = false) BlogReactionRequest request
    ) {
        return blogService.setReaction(id, request);
    }

    @GetMapping("/{id}/comments")
    public List<BlogCommentResponse> comments(@PathVariable Long id) {
        return blogService.getComments(id);
    }

    @PostMapping("/{id}/comments")
    public BlogCommentResponse createComment(
        @PathVariable Long id,
        @jakarta.validation.Valid @RequestBody BlogCommentRequest request
    ) {
        return blogService.createComment(id, request);
    }

    @PutMapping("/comments/{commentId}")
    public BlogCommentResponse updateComment(
        @PathVariable Long commentId,
        @jakarta.validation.Valid @RequestBody BlogCommentUpdateRequest request
    ) {
        return blogService.updateComment(commentId, request);
    }

    @DeleteMapping("/comments/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable Long commentId) {
        blogService.deleteComment(commentId);
    }

    @PutMapping("/comments/{commentId}/like")
    public java.util.Map<String, Boolean> toggleCommentLike(@PathVariable Long commentId) {
        return java.util.Map.of("liked", blogService.toggleCommentLike(commentId));
    }
}

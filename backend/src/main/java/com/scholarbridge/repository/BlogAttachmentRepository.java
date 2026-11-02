package com.scholarbridge.repository;

import com.scholarbridge.entity.BlogAttachment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogAttachmentRepository extends JpaRepository<BlogAttachment, Long> {
    List<BlogAttachment> findByPostId(Long postId);
    long countByPostId(Long postId);

    @EntityGraph(attributePaths = {"post", "post.author"})
    Optional<BlogAttachment> findDetailedById(Long id);
}

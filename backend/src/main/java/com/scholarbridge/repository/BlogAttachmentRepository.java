package com.scholarbridge.repository;

import com.scholarbridge.entity.BlogAttachment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogAttachmentRepository extends JpaRepository<BlogAttachment, Long> {
    List<BlogAttachment> findByPostId(Long postId);
}

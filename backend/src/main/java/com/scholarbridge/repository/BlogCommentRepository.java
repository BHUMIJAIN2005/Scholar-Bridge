package com.scholarbridge.repository;

import com.scholarbridge.entity.BlogComment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogCommentRepository extends JpaRepository<BlogComment, Long> {
    List<BlogComment> findByPostIdAndParentCommentIsNullOrderByCreatedAtAsc(Long postId);
}

package com.scholarbridge.repository;

import com.scholarbridge.entity.BlogPost;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {
    List<BlogPost> findByAuthorIdOrderByUpdatedAtDesc(Long authorId);
}

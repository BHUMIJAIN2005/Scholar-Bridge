package com.scholarbridge.repository;

import com.scholarbridge.entity.BlogReaction;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogReactionRepository extends JpaRepository<BlogReaction, Long> {
    Optional<BlogReaction> findByPostIdAndUserId(Long postId, Long userId);
}

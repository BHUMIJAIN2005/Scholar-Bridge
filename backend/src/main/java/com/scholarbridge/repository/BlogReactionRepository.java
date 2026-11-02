package com.scholarbridge.repository;

import com.scholarbridge.entity.BlogReaction;
import com.scholarbridge.entity.BlogReactionType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BlogReactionRepository extends JpaRepository<BlogReaction, Long> {
    Optional<BlogReaction> findByPostIdAndUserId(Long postId, Long userId);

    @Query("""
        select r.post.id as postId, r.type as type, count(r) as reactionCount
        from BlogReaction r
        where r.post.id in :postIds
        group by r.post.id, r.type
        """)
    List<ReactionCount> countByPostIds(@Param("postIds") Collection<Long> postIds);

    interface ReactionCount {
        Long getPostId();
        BlogReactionType getType();
        long getReactionCount();
    }
}

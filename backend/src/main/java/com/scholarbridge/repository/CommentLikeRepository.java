package com.scholarbridge.repository;

import com.scholarbridge.entity.CommentLike;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {
    Optional<CommentLike> findByCommentIdAndUserId(Long commentId, Long userId);

    List<CommentLike> findByCommentIdInAndUserId(Collection<Long> commentIds, Long userId);

    @Query("""
        select l.comment.id as commentId, count(l) as likeCount
        from CommentLike l
        where l.comment.id in :commentIds
        group by l.comment.id
        """)
    List<CommentCount> countByCommentIds(@Param("commentIds") Collection<Long> commentIds);

    interface CommentCount {
        Long getCommentId();
        long getLikeCount();
    }
}

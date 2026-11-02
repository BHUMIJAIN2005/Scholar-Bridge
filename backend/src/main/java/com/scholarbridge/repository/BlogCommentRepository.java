package com.scholarbridge.repository;

import com.scholarbridge.entity.BlogComment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BlogCommentRepository extends JpaRepository<BlogComment, Long> {
    @EntityGraph(attributePaths = {"author", "parentComment"})
    List<BlogComment> findByPostIdOrderByCreatedAtAsc(Long postId);

    @EntityGraph(attributePaths = {"author", "post", "post.author", "parentComment", "parentComment.author"})
    @Query("select c from BlogComment c where c.id = :id")
    Optional<BlogComment> findDetailedById(@Param("id") Long id);
}

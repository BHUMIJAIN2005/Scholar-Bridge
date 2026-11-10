package com.scholarbridge.repository;

import com.scholarbridge.entity.BlogPost;
import com.scholarbridge.entity.BlogPostStatus;
import com.scholarbridge.entity.UserRole;
import jakarta.persistence.LockModeType;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BlogPostRepository extends JpaRepository<BlogPost, Long> {
    @Query("""
        select p.id from BlogPost p
        where p.status = :status
          and (:tag is null or exists (select t.id from p.tags t where t.name = :tag))
          and (:authorRole is null or p.author.role = :authorRole)
          and (:query is null or lower(p.title) like lower(concat('%', :query, '%')))
        """)
    Page<Long> findPostIds(
        @Param("status") BlogPostStatus status,
        @Param("tag") String tag,
        @Param("authorRole") UserRole authorRole,
        @Param("query") String query,
        Pageable pageable
    );

    @EntityGraph(attributePaths = {"author", "linkedPaper", "tags"})
    List<BlogPost> findByIdIn(Collection<Long> ids);

    @EntityGraph(attributePaths = {"author", "linkedPaper", "tags"})
    @Query("select p from BlogPost p where p.id = :id")
    Optional<BlogPost> findDetailedById(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from BlogPost p where p.id = :id")
    Optional<BlogPost> findForUpdateById(@Param("id") Long id);

    @EntityGraph(attributePaths = {"author", "linkedPaper", "tags"})
    List<BlogPost> findByAuthorIdOrderByUpdatedAtDesc(Long authorId);

    @EntityGraph(attributePaths = {"author", "linkedPaper", "tags"})
    List<BlogPost> findByAuthorIdAndStatusOrderByUpdatedAtDesc(Long authorId, BlogPostStatus status);

    @Query("""
        select t.name as name, count(p.id) as postCount
        from BlogPost p join p.tags t
        where p.status = :status
        group by t.name
        order by count(p.id) desc, t.name asc
        """)
    List<BlogTagUsage> findPopularTags(@Param("status") BlogPostStatus status, Pageable pageable);

    interface BlogTagUsage {
        String getName();
        long getPostCount();
    }
}

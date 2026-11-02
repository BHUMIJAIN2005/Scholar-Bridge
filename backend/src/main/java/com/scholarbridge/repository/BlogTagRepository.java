package com.scholarbridge.repository;

import com.scholarbridge.entity.BlogTag;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogTagRepository extends JpaRepository<BlogTag, Long> {
    Optional<BlogTag> findByName(String name);
    List<BlogTag> findByNameIn(Collection<String> names);
}

package com.scholarbridge.repository;

import com.scholarbridge.entity.Publication;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PublicationRepository extends JpaRepository<Publication, Long> {
    @Query("""
        select publication from Publication publication
        where publication.faculty.id = :facultyId
        order by case when publication.year is null then 1 else 0 end,
            publication.year desc, publication.id desc
        """)
    List<Publication> findByFacultyIdNewestFirst(@Param("facultyId") Long facultyId);
}

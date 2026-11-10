package com.scholarbridge.repository;

import com.scholarbridge.entity.Application;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByStudentIdOrderByAppliedAtDesc(Long studentId);
    List<Application> findByOpeningIdOrderByAppliedAtDesc(Long openingId);
    boolean existsByStudentIdAndOpeningId(Long studentId, Long openingId);

    @Query("""
        select case when count(a) > 0 then true else false end
        from Application a
        where a.student.id = :studentId and a.opening.faculty.id = :facultyId
        """)
    boolean existsByStudentAndFaculty(@Param("studentId") Long studentId, @Param("facultyId") Long facultyId);
}
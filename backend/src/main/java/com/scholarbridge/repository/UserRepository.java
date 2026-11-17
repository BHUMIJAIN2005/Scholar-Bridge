package com.scholarbridge.repository;

import com.scholarbridge.entity.User;
import com.scholarbridge.entity.UserRole;
import com.scholarbridge.entity.FacultyApprovalStatus;
import com.scholarbridge.entity.StudentVisibility;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByGoogleSubject(String googleSubject);
    boolean existsByEmailIgnoreCase(String email);

    @EntityGraph(attributePaths = "facultyProfile")
    Optional<User> findByIdAndRole(Long id, UserRole role);

    @EntityGraph(attributePaths = "studentProfile")
    List<User> findAllByRole(UserRole role);

    @EntityGraph(attributePaths = "facultyProfile")
    @Query(value = """
        select distinct u from User u
        left join u.facultyProfile fp
        left join fp.researchInterests interest
        where u.role = :facultyRole
          and (fp.approvalStatus = :approved
            or (fp.approvalStatus is null and (u.approvalStatus = :approved or u.approvalStatus is null)))
          and (:query is null or lower(u.name) like lower(concat('%', :query, '%')))
          and (:researchArea is null
            or lower(fp.researchDomains) like lower(concat('%', :researchArea, '%'))
            or lower(interest) like lower(concat('%', :researchArea, '%')))
          and (:acceptingStudents is null or fp.acceptingStudents = :acceptingStudents)
        """,
        countQuery = """
        select count(distinct u.id) from User u
        left join u.facultyProfile fp
        left join fp.researchInterests interest
        where u.role = :facultyRole
          and (fp.approvalStatus = :approved
            or (fp.approvalStatus is null and (u.approvalStatus = :approved or u.approvalStatus is null)))
          and (:query is null or lower(u.name) like lower(concat('%', :query, '%')))
          and (:researchArea is null
            or lower(fp.researchDomains) like lower(concat('%', :researchArea, '%'))
            or lower(interest) like lower(concat('%', :researchArea, '%')))
          and (:acceptingStudents is null or fp.acceptingStudents = :acceptingStudents)
        """)
    Page<User> findFacultyDirectory(
        @Param("facultyRole") UserRole facultyRole,
        @Param("approved") FacultyApprovalStatus approved,
        @Param("query") String query,
        @Param("researchArea") String researchArea,
        @Param("acceptingStudents") Boolean acceptingStudents,
        Pageable pageable
    );

    @EntityGraph(attributePaths = "facultyProfile")
    @Query("""
        select u from User u
        left join u.facultyProfile fp
        where u.id = :id and u.role = :facultyRole
          and (fp.approvalStatus = :approved
            or (fp.approvalStatus is null and (u.approvalStatus = :approved or u.approvalStatus is null)))
        """)
    Optional<User> findApprovedFacultyById(@Param("id") Long id,
        @Param("facultyRole") UserRole facultyRole,
        @Param("approved") FacultyApprovalStatus approved);

    @EntityGraph(attributePaths = "facultyProfile")
    @Query("""
        select u from User u
        left join u.facultyProfile fp
        where u.role = :facultyRole
          and (fp.approvalStatus = :approved
            or (fp.approvalStatus is null and (u.approvalStatus = :approved or u.approvalStatus is null)))
          and fp.aiProfileConfirmed = true
          and fp.aiResearchProfileJson is not null
        """)
    List<User> findApprovedFacultyWithConfirmedAiResearchProfile(
        @Param("facultyRole") UserRole facultyRole,
        @Param("approved") FacultyApprovalStatus approved
    );

    @EntityGraph(attributePaths = "studentProfile")
    @Query(value = """
        select u from User u
        left join u.studentProfile sp
        where u.role = :studentRole
          and (:query is null or lower(u.name) like lower(concat('%', :query, '%')))
          and (:skill is null
            or lower(sp.skills) like lower(concat('%', :skill, '%'))
            or exists (
              select skillTag from StudentProfile skillProfile
              join skillProfile.skillTags skillTag
              where skillProfile = sp and lower(skillTag) like lower(concat('%', :skill, '%'))
            ))
          and (sp.visibility = :allUsers or sp.visibility is null
            or u.id = :viewerId
            or (:viewerRole = :facultyRole and exists (
              select a.id from Application a
              where a.student = u and a.opening.faculty.id = :viewerId
            )))
        """,
        countQuery = """
        select count(u) from User u
        left join u.studentProfile sp
        where u.role = :studentRole
          and (:query is null or lower(u.name) like lower(concat('%', :query, '%')))
          and (:skill is null
            or lower(sp.skills) like lower(concat('%', :skill, '%'))
            or exists (
              select skillTag from StudentProfile skillProfile
              join skillProfile.skillTags skillTag
              where skillProfile = sp and lower(skillTag) like lower(concat('%', :skill, '%'))
            ))
          and (sp.visibility = :allUsers or sp.visibility is null
            or u.id = :viewerId
            or (:viewerRole = :facultyRole and exists (
              select a.id from Application a
              where a.student = u and a.opening.faculty.id = :viewerId
            )))
        """)
    Page<User> findVisibleStudentsForViewer(
        @Param("studentRole") UserRole studentRole,
        @Param("query") String query,
        @Param("skill") String skill,
        @Param("viewerId") Long viewerId,
        @Param("viewerRole") UserRole viewerRole,
        @Param("facultyRole") UserRole facultyRole,
        @Param("allUsers") StudentVisibility allUsers,
        Pageable pageable
    );

    @EntityGraph(attributePaths = "studentProfile")
    @Query("select u from User u where u.id = :id and u.role = :role")
    Optional<User> findByIdAndRoleWithStudentProfile(@Param("id") Long id, @Param("role") UserRole role);
}
package com.scholarbridge.config;

import com.scholarbridge.entity.BlogComment;
import com.scholarbridge.entity.BlogPost;
import com.scholarbridge.entity.BlogPostStatus;
import com.scholarbridge.entity.BlogReaction;
import com.scholarbridge.entity.BlogReactionType;
import com.scholarbridge.entity.BlogTag;
import com.scholarbridge.entity.User;
import com.scholarbridge.repository.BlogCommentRepository;
import com.scholarbridge.repository.BlogPostRepository;
import com.scholarbridge.repository.BlogReactionRepository;
import com.scholarbridge.repository.BlogTagRepository;
import com.scholarbridge.repository.UserRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class BlogDemoDataSeeder {
    private static final Logger logger = LoggerFactory.getLogger(BlogDemoDataSeeder.class);

    private final BlogPostRepository posts;
    private final BlogTagRepository tags;
    private final BlogCommentRepository comments;
    private final BlogReactionRepository reactions;
    private final UserRepository users;

    public BlogDemoDataSeeder(
        BlogPostRepository posts,
        BlogTagRepository tags,
        BlogCommentRepository comments,
        BlogReactionRepository reactions,
        UserRepository users
    ) {
        this.posts = posts;
        this.tags = tags;
        this.comments = comments;
        this.reactions = reactions;
        this.users = users;
    }

    @Transactional
    public void seedIfEmpty() {
        if (posts.count() > 0) {
            logger.info("Skipping blog demo data because blog posts already exist.");
            return;
        }

        Optional<User> studentUser = users.findByEmailIgnoreCase("student@scholarbridge.edu");
        Optional<User> facultyUser = users.findByEmailIgnoreCase("faculty@scholarbridge.edu");
        if (studentUser.isEmpty() || facultyUser.isEmpty()) {
            logger.warn("Skipping blog demo data because the seeded student and faculty users are not both available.");
            return;
        }

        User student = studentUser.get();
        User faculty = facultyUser.get();
        Map<String, BlogTag> tagCache = new HashMap<>();
        List<BlogPost> publishedPosts = new ArrayList<>();

        publishedPosts.add(createPost(
            student,
            "How I wrote my first research paper",
            "A practical account of moving from a class project to a first research paper.",
            """
                I started with a question from a class project that I could not answer with the examples in our textbook. My advisor helped me narrow it into one measurable problem, and I spent the first week reading papers before writing any code. Keeping a small experiment log saved me when an early result turned out to be caused by a data split mistake. I wrote the methods section while the experiments were fresh, then revised the introduction after I understood what the results actually supported. Submitting the paper was nerve-racking, but the process taught me that clear limitations are just as important as promising results.
                """,
            List.of("research", "writing", "student-experience"),
            BlogPostStatus.PUBLISHED,
            tagCache
        ));
        publishedPosts.add(createPost(
            student,
            "Choosing a research topic as a third-year student",
            "A way to find a focused research question that fits your time and experience.",
            """
                In my third year, every interesting topic seemed either too broad or too advanced to begin. I made a shortlist by looking for questions that appeared repeatedly in recent papers but still had a small, testable gap. Talking with faculty and senior students helped me check whether the data and tools were realistically available. I also picked a topic where a useful negative result would still teach me something, rather than relying on one ideal outcome. A focused question gave me a better starting point than trying to choose the most fashionable area.
                """,
            List.of("research", "student-experience", "planning"),
            BlogPostStatus.PUBLISHED,
            tagCache
        ));
        publishedPosts.add(createPost(
            faculty,
            "What I look for as a reviewer",
            "Reviewing is about evaluating a paper's evidence and helping its authors improve.",
            """
                When I review a paper, I first try to identify the exact claim the authors want readers to believe. I then check whether the methods and comparisons provide enough evidence for that claim, rather than expecting every paper to solve an entire field. Clear descriptions of datasets, baselines, and limitations make it much easier to assess the contribution fairly. I value a well-supported modest result more than a sweeping conclusion built on a narrow experiment. My most useful reviews explain the reasoning behind each concern and suggest a practical way to address it.
                """,
            List.of("peer-review", "research", "academic-writing"),
            BlogPostStatus.PUBLISHED,
            tagCache
        ));
        publishedPosts.add(createPost(
            student,
            "Learning LaTeX the hard way",
            "Small habits that made writing and collaborating in LaTeX less frustrating.",
            """
                I first tried LaTeX the night before a report was due and spent more time fixing braces than checking my argument. The turning point was moving the paper into small files and compiling after each meaningful change. I learned to keep figures and bibliography entries in predictable folders, and to read the first error in the log instead of guessing at the last one. Version control also made collaboration calmer because we could review changes instead of passing around renamed document copies. I still look up commands, but the workflow now feels dependable rather than mysterious.
                """,
            List.of("latex", "writing", "tools"),
            BlogPostStatus.PUBLISHED,
            tagCache
        ));
        publishedPosts.add(createPost(
            student,
            "Turning a course project into a conference paper",
            "How a course project can become a stronger research submission with careful follow-up.",
            """
                Our course project became a possible paper only after we stopped treating the demo as the main contribution. We revisited the project question, added a baseline, and repeated the evaluation on data that had not guided our design choices. A faculty mentor helped us separate what we had actually measured from what we had hoped the system would do. We also documented setup steps so another student could reproduce the central result without our laptops. The extra work took longer than the original course, but it gave us a much clearer and more honest story to submit.
                """,
            List.of("course-project", "conference", "research"),
            BlogPostStatus.PUBLISHED,
            tagCache
        ));

        createPost(
            faculty,
            "Notes on building reproducible NLP experiments",
            "A draft checklist for making small NLP experiments easier to reproduce.",
            """
                I am collecting a short checklist for experiments that students can rerun after a semester has passed. It should record dataset versions, preprocessing choices, random seeds, and the exact evaluation script. The first draft will focus on lightweight NLP projects that can run on a standard lab machine. I would also like to include examples of reporting uncertainty without making the write-up harder to follow.
                """,
            List.of("nlp", "reproducibility"),
            BlogPostStatus.DRAFT,
            tagCache
        );

        addComment(
            publishedPosts.get(0),
            student,
            "Writing the methods section early helped me catch missing details in my own experiments.",
            null
        );
        BlogComment reviewerComment = addComment(
            publishedPosts.get(0),
            faculty,
            "That is a valuable habit. A compact experiment log can make this step even easier.",
            null
        );
        addComment(
            publishedPosts.get(0),
            student,
            "I have started recording the dataset version and split alongside each run.",
            reviewerComment
        );

        BlogComment topicComment = addComment(
            publishedPosts.get(1),
            faculty,
            "The point about a useful negative result is especially important for an early project.",
            null
        );
        addComment(
            publishedPosts.get(1),
            student,
            "It made it easier to plan a realistic fallback experiment with my mentor.",
            topicComment
        );
        addComment(
            publishedPosts.get(2),
            student,
            "The distinction between a modest claim and a broad claim is helpful when revising.",
            null
        );
        addComment(
            publishedPosts.get(4),
            faculty,
            "Reproducibility notes are a good contribution to the research group beyond the paper itself.",
            null
        );

        addReaction(publishedPosts.get(0), student, BlogReactionType.LIKE);
        addReaction(publishedPosts.get(0), faculty, BlogReactionType.INSIGHTFUL);
        addReaction(publishedPosts.get(1), student, BlogReactionType.HELPFUL);
        addReaction(publishedPosts.get(1), faculty, BlogReactionType.LIKE);
        addReaction(publishedPosts.get(2), student, BlogReactionType.INSIGHTFUL);
        addReaction(publishedPosts.get(2), faculty, BlogReactionType.INSPIRING);
        addReaction(publishedPosts.get(3), student, BlogReactionType.LIKE);
        addReaction(publishedPosts.get(4), student, BlogReactionType.INSPIRING);
        addReaction(publishedPosts.get(4), faculty, BlogReactionType.HELPFUL);

        logger.info("Seeded 5 published blog posts, 1 draft, comments with replies, and 9 reactions.");
    }

    private BlogPost createPost(
        User author,
        String title,
        String summary,
        String content,
        List<String> tagNames,
        BlogPostStatus status,
        Map<String, BlogTag> tagCache
    ) {
        BlogPost post = new BlogPost();
        post.setAuthor(author);
        post.setTitle(title);
        post.setSummary(summary);
        post.setContent(content.trim());
        post.setStatus(status);
        for (String tagName : tagNames) {
            String normalizedName = tagName.toLowerCase(Locale.ROOT);
            BlogTag tag = tagCache.computeIfAbsent(normalizedName, this::findOrCreateTag);
            post.getTags().add(tag);
        }
        return posts.save(post);
    }

    private BlogTag findOrCreateTag(String name) {
        return tags.findByName(name).orElseGet(() -> {
            BlogTag tag = new BlogTag();
            tag.setName(name);
            return tags.save(tag);
        });
    }

    private BlogComment addComment(BlogPost post, User author, String content, BlogComment parent) {
        BlogComment comment = new BlogComment();
        comment.setPost(post);
        comment.setAuthor(author);
        comment.setContent(content);
        comment.setParentComment(parent);
        return comments.save(comment);
    }

    private void addReaction(BlogPost post, User user, BlogReactionType type) {
        BlogReaction reaction = new BlogReaction();
        reaction.setPost(post);
        reaction.setUser(user);
        reaction.setType(type);
        reactions.save(reaction);
    }
}

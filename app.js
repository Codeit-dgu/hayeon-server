require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = express();

app.use(express.json());

// 게시글 작성
app.post('/api/groups/:groupId/posts', async (req, res) => {
  const { groupId } = req.params;
  const {
    nickname,
    title,
    content,
    postPassword,
    groupPassword,
    imageUrl,
    tags,
    location,
    moment,
    isPublic
  } = req.body;

  try {
    const group = await prisma.group.findUnique({
      where: { id: parseInt(groupId) }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.groupPassword !== groupPassword) {
      return res.status(403).json({ error: 'Invalid group password' });
    }

  
    const tagList = tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    const newTags = tagList.map(tag => ({ name: tag }));


    const newPost = await prisma.post.create({
      data: {
        nickname,
        title,
        content,
        postPassword,
        imageUrl,
        location,
        moment: new Date(moment),
        createAt: new Date(),
        isPublic,
        group: {
          connect: { id: parseInt(groupId) }
        },
        tags: {
          create: newTags 
        }
      },
      include: {
        tags: true
      }
    });

   
    res.json({
      id: newPost.id,
      groupId: newPost.groupId,
      nickname: newPost.nickname,
      title: newPost.title,
      content: newPost.content,
      imageUrl: newPost.imageUrl,
      tags: newPost.tags.map(tag => tag.name),
      location: newPost.location,
      moment: newPost.moment.toISOString().split('T')[0],
      isPublic: newPost.isPublic,
      likeCount: newPost.likeCount,
      commentCount: newPost.commentCount,
      createdAt: newPost.createAt.toISOString()
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// 포스트 삭제
app.delete('/api/posts/:postId', async (req, res) => {
  const { postId } = req.params;
  const { postPassword } = req.body; 

  try {
    const post = await prisma.post.findUnique({
      where: { id: parseInt(postId) }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.postPassword !== postPassword) {
      return res.status(403).json({ error: 'Invalid post password' });
    }
    await prisma.tag.deleteMany({
      where: { postId: parseInt(postId) }
    });

    await prisma.post.delete({
      where: { id: parseInt(postId) }
    });

    res.status(200).send(); 

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 게시글 상세 조회
app.get('/api/groups/:groupId/posts', async (req, res) => {
  const { groupId } = req.params;
  const { keyword, isPublic, sortBy, page = 1, pageSize = 10 } = req.query;

  let orderBy = {
    createAt: 'desc',
  };

  if (sortBy === 'mostCommented') {
    orderBy = {
      commentCount: 'desc',
    };
  } else if (sortBy === 'mostLiked') {
    orderBy = {
      likeCount: 'desc',
    };
  }

  const take = parseInt(pageSize);
  const skip = (parseInt(page) - 1) * take;

  try {
    const [posts, totalItemCount] = await Promise.all([
      prisma.post.findMany({
        where: {
          groupId: parseInt(groupId),
          isPublic: isPublic === 'true',
          OR: [
            {
              title: {
                contains: keyword || ""
              }
            },
            {
              content: {
                contains: keyword || ""
              }
            }
          ],
        },
        orderBy,
        include: {
          tags: true,
        },
        take,
        skip,
      }),
      prisma.post.count({
        where: {
          groupId: parseInt(groupId),
          isPublic: isPublic === 'true',
          OR: [
            {
              title: {
                contains: keyword || ""
              }
            },
            {
              content: {
                contains: keyword || ""
              }
            }
          ],
        }
      })
    ]);

    const totalPages = Math.ceil(totalItemCount / take);
    
    res.status(200).json({
      currentPage: parseInt(page),
      totalPages: totalPages,
      totalItemCount: totalItemCount,
      data: posts.map(post => ({
        id: post.id,
        nickname: post.nickname,
        title: post.title,
        imageUrl: post.imageUrl,
        tags: post.tags.map(tag => tag.name),
        location: post.location,
        moment: post.moment,
        isPublic: post.isPublic,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        createdAt: post.createdAt, 
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '게시글을 가져오는 중 오류가 발생했습니다.' });
  }
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

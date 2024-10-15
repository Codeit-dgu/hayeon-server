const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = express();

app.use(express.json());


//포스트 작성
// 포스트 작성
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

    const existingTags = await prisma.tag.findMany({
      where: {
        name: { in: tagList }
      }
    });

    const existingTagNames = existingTags.map(tag => tag.name);
    const newTags = tagList
      .filter(tag => !existingTagNames.includes(tag))
      .map(tag => ({ name: tag }));

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



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

import axios from 'axios';
const baseURL = 'http://localhost:5000';

async function testFeed() {
  try {
    // Login to get session cookie
    const loginResponse = await axios.post(`${baseURL}/api/login`, {
      username: 'testuser',
      password: 'testpassword'
    }, { withCredentials: true });
    
    console.log('Login successful:', loginResponse.data);
    
    // Get the session cookie
    const cookies = loginResponse.headers['set-cookie'];
    
    // Create a configured axios instance with the cookie
    const axiosWithAuth = axios.create({
      baseURL,
      headers: {
        Cookie: cookies ? cookies.join('; ') : ''
      }
    });
    
    // Create multiple test posts for pagination testing
    console.log('Creating multiple test posts...');
    
    // Array to hold created post IDs
    const createdPosts = [];
    
    // Create 5 test posts
    for (let i = 0; i < 5; i++) {
      try {
        const postResponse = await axiosWithAuth.post('/api/posts', {
          userId: loginResponse.data.id,
          restaurantId: 1,
          content: `Test pagination post #${i+1}`,
          rating: (i % 5) + 1, // Vary ratings 1-5
          visibility: 'public',
          tags: ['test', 'pagination'],
          imageUrl: null,
          dishName: `Test Dish ${i+1}`
        });
        
        console.log(`Created post #${i+1} with ID: ${postResponse.data.id}`);
        createdPosts.push(postResponse.data.id);
      } catch (error) {
        console.error(`Error creating post #${i+1}:`, error.response?.data || error.message);
      }
    }
    
    // Wait a moment to ensure all posts are processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test pagination with different page sizes
    console.log('\nTesting pagination...');
    
    // Test page 1 with limit 2
    const feedResponse1 = await axiosWithAuth.get('/api/feed?page=1&limit=2');
    console.log('\nPage 1 (limit 2):', JSON.stringify(feedResponse1.data.pagination, null, 2));
    console.log(`Posts returned: ${feedResponse1.data.posts.length}`);
    
    // Test page 2 with limit 2
    const feedResponse2 = await axiosWithAuth.get('/api/feed?page=2&limit=2');
    console.log('\nPage 2 (limit 2):', JSON.stringify(feedResponse2.data.pagination, null, 2));
    console.log(`Posts returned: ${feedResponse2.data.posts.length}`);
    
    // Test page 3 with limit 2
    const feedResponse3 = await axiosWithAuth.get('/api/feed?page=3&limit=2');
    console.log('\nPage 3 (limit 2):', JSON.stringify(feedResponse3.data.pagination, null, 2));
    console.log(`Posts returned: ${feedResponse3.data.posts.length}`);
    
    // Test with larger limit
    const feedResponseAll = await axiosWithAuth.get('/api/feed?page=1&limit=10');
    console.log('\nAll posts (limit 10):', JSON.stringify(feedResponseAll.data.pagination, null, 2));
    console.log(`Total posts returned: ${feedResponseAll.data.posts.length}`);
    
    // Verify correct sorting (newest first)
    console.log('\nVerifying sort order (newest first):');
    
    let isCorrectlySorted = true;
    let previousTimestamp = null;
    
    for (let i = 0; i < feedResponseAll.data.posts.length; i++) {
      const post = feedResponseAll.data.posts[i];
      const currentTimestamp = new Date(post.createdAt).getTime();
      
      console.log(`Post ID: ${post.id}, Created: ${post.createdAt}`);
      
      if (previousTimestamp !== null && currentTimestamp > previousTimestamp) {
        console.log(`❌ ERROR: Post ${post.id} is out of order!`);
        isCorrectlySorted = false;
      }
      
      previousTimestamp = currentTimestamp;
    }
    
    console.log(`\nPosts sorted correctly (newest first): ${isCorrectlySorted ? '✅ YES' : '❌ NO'}`);
    
    // Test user-specific feed
    console.log('\nTesting user-specific feed:');
    const userFeedResponse = await axiosWithAuth.get(`/api/feed?userId=${loginResponse.data.id}`);
    console.log(`User-specific feed pagination:`, JSON.stringify(userFeedResponse.data.pagination, null, 2));
    console.log(`Posts by user: ${loginResponse.data.username}:`, userFeedResponse.data.posts.length);
    
    // Verify all posts in the user feed belong to the specific user
    let allPostsBelongToUser = true;
    for (const post of userFeedResponse.data.posts) {
      if (post.userId !== loginResponse.data.id) {
        console.log(`❌ ERROR: Post ${post.id} doesn't belong to user ${loginResponse.data.id}!`);
        allPostsBelongToUser = false;
      }
    }
    
    console.log(`\nUser-specific feed working correctly: ${allPostsBelongToUser ? '✅ YES' : '❌ NO'}`);
    
    // Test comment counts
    console.log('\nTesting comment counts:');
    
    // Create a comment on the first post
    const targetPostId = userFeedResponse.data.posts[0].id;
    console.log(`Creating comment on post ID: ${targetPostId}`);
    
    try {
      const commentResponse = await axiosWithAuth.post('/api/comments', {
        userId: loginResponse.data.id,
        postId: targetPostId,
        content: 'Test comment for checking comment count'
      });
      
      console.log(`Comment created:`, commentResponse.data);
      
      // Create another comment
      await axiosWithAuth.post('/api/comments', {
        userId: loginResponse.data.id,
        postId: targetPostId,
        content: 'Second test comment'
      });
      
      // Fetch the post again to check if the comment count is updated
      const updatedPostResponse = await axiosWithAuth.get(`/api/feed?postId=${targetPostId}`);
      
      if (updatedPostResponse.data.posts.length > 0) {
        const updatedPost = updatedPostResponse.data.posts[0];
        console.log(`Post ${targetPostId} comment count: ${updatedPost.commentCount}`);
        console.log(`Comment count accurate: ${updatedPost.commentCount === 2 ? '✅ YES' : '❌ NO'}`);
      } else {
        console.log('❌ ERROR: Could not fetch the updated post');
      }
    } catch (error) {
      console.error('Error testing comments:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Error during test:', error.response?.data || error.message);
  }
}

testFeed();
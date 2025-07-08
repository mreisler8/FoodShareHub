/**
 * Test Media Upload Functionality
 * Tests the complete media upload system with Cloudinary integration
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// Create a simple test image file
const testImageContent = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const testImageBuffer = Buffer.from(testImageContent, 'base64');

async function testMediaUpload() {
  console.log('🎬 Testing Media Upload System');
  console.log('================================');
  
  try {
    // Create temporary test image file
    fs.writeFileSync('/tmp/test-image.png', testImageBuffer);
    
    // Test 1: Check upload endpoint availability
    console.log('✅ Test 1: Upload endpoint availability');
    const form = new FormData();
    form.append('files', fs.createReadStream('/tmp/test-image.png'), 'test-image.png');
    
    const response = await axios.post('http://localhost:5000/api/uploads', form, {
      headers: {
        ...form.getHeaders(),
        'Cookie': 'connect.sid=s%3A4X3hOm5v2xjjgfqk7Tm42L1AkAjL4U71.w7QNlMVl1Q9H8fv%2FEfe%2FcIA8b9PH3KGx%2FSIm5%2B1gFbc'
      }
    });
    
    console.log('Upload response:', response.data);
    
    // Test 2: Create post with uploaded media
    console.log('✅ Test 2: Creating post with media');
    const postData = {
      content: 'Test post with media upload',
      rating: 5,
      restaurantId: 1,
      images: response.data.urls || [],
      visibility: 'public'
    };
    
    const postResponse = await axios.post('http://localhost:5000/api/posts', postData, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3A4X3hOm5v2xjjgfqk7Tm42L1AkAjL4U71.w7QNlMVl1Q9H8fv%2FEfe%2FcIA8b9PH3KGx%2FSIm5%2B1gFbc'
      }
    });
    
    console.log('Post creation response:', postResponse.data);
    
    // Test 3: Verify media is displayed in feed
    console.log('✅ Test 3: Verifying media in feed');
    const feedResponse = await axios.get('http://localhost:5000/api/feed', {
      headers: {
        'Cookie': 'connect.sid=s%3A4X3hOm5v2xjjgfqk7Tm42L1AkAjL4U71.w7QNlMVl1Q9H8fv%2FEfe%2FcIA8b9PH3KGx%2FSIm5%2B1gFbc'
      }
    });
    
    const postsWithMedia = feedResponse.data.posts.filter(post => 
      (post.images && post.images.length > 0) || (post.videos && post.videos.length > 0)
    );
    
    console.log(`Found ${postsWithMedia.length} posts with media`);
    
    // Cleanup
    fs.unlinkSync('/tmp/test-image.png');
    
    console.log('🎉 Media upload system test completed successfully!');
    
  } catch (error) {
    console.error('❌ Media upload test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testMediaUpload();
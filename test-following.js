// Quick test for following extraction
const { createClient } = require('@supabase/supabase-js');

// Test configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFollowingExtraction() {
  console.log('Testing following extraction...');
  
  // Create a test extraction job
  const response = await fetch('http://localhost:3000/api/extractions/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'following',
      targets: ['saifsfujifilm'], // Must be an array as expected by API
      filters: {
        coinLimit: 20,
        location: '',
        extractEmail: false,
        extractPhone: false,
        extractLinkInBio: false
      },
      user_id: 'cce4e4dd-5f0f-4c72-b7cd-0fb7c3b7bc5f' // Use user_id not userId
    })
  });

  const result = await response.json();
  console.log('API Response:', result);
  
  if (result.success) {
    console.log(`✅ Following extraction job created successfully! Job ID: ${result.jobId}`);
    console.log(`Estimated cost: ${result.estimatedCost} coins`);
    
    // Poll for completion
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    while (attempts < maxAttempts) {
      const { data: extraction } = await supabase
        .from('extractions')
        .select('status, page_count')
        .eq('id', result.jobId)
        .single();
      
      console.log(`Poll ${attempts + 1}: Status = ${extraction?.status}`);
      
      if (extraction?.status === 'completed') {
        console.log('✅ Extraction completed!');
        console.log(`Pages processed: ${extraction.page_count}`);
        
        // Check extracted users
        const { data: users, count } = await supabase
          .from('extracted_users')
          .select('*', { count: 'exact' })
          .eq('extraction_id', result.jobId);
        
        console.log(`📊 Total users extracted: ${count}`);
        if (users && users.length > 0) {
          console.log('Sample user:', users[0]);
        }
        
        break;
      } else if (extraction?.status === 'failed') {
        console.log('❌ Extraction failed');
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    if (attempts >= maxAttempts) {
      console.log('⏰ Extraction timed out');
    }
  } else {
    console.log('❌ Failed to create extraction job:', result.error);
  }
}

testFollowingExtraction().catch(console.error);

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { supabase } = require('./supabaseClient');
const { verifyAuth } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// --- PUBLIC ROUTES ---

// GET all scholarships (with basic filtering)
app.get('/api/scholarships', async (req, res) => {
  try {
    const { country, degree_level, funding_type } = req.query;
    
    let query = supabase.from('scholarships').select('*');
    
    if (country) query = query.ilike('country', `%${country}%`);
    if (degree_level) query = query.ilike('degree_level', `%${degree_level}%`);
    if (funding_type) query = query.ilike('funding_type', `%${funding_type}%`);
    
    const { data, error } = await query;
    if (error) throw error;
    
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single scholarship by ID
app.get('/api/scholarships/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('scholarships')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// --- PROTECTED ROUTES ---

// SAVE a scholarship for the logged-in user
app.post('/api/saved-scholarships', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { scholarshipId } = req.body;
    
    if (!scholarshipId) {
      return res.status(400).json({ error: 'scholarshipId is required' });
    }

    // Insert as service_role (the middleware already validated the JWT and gave us the real user id)
    // We use the Supabase client initialized with the SERVICE_ROLE key here because we are acting as the backend API.
    // However, since we are doing custom API logic, we insert directly using the user's ID.
    const { data, error } = await supabase
      .from('saved_scholarships')
      .insert([
        { user_id: userId, scholarship_id: scholarshipId }
      ])
      .select();

    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    // Check for unique constraint violation (already saved)
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Scholarship already saved' });
    }
    res.status(500).json({ error: err.message });
  }
});

// REMOVE a saved scholarship
app.delete('/api/saved-scholarships/:id', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const scholarshipId = req.params.id; // Could be the saved_scholarship table ID or the scholarship_id itself. Let's assume scholarship_id.

    const { data, error } = await supabase
      .from('saved_scholarships')
      .delete()
      .eq('user_id', userId)
      .eq('scholarship_id', scholarshipId)
      .select();

    if (error) throw error;
    res.json({ message: 'Removed successfully', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET saved scholarships for user
app.get('/api/saved-scholarships', verifyAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const { data, error } = await supabase
      .from('saved_scholarships')
      .select('*, scholarships(*)')
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

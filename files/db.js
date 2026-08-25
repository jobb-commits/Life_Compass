const db = {
  async _client() {
    return window.supabaseReady;
  },

  async getUser() {
    const client = await this._client();
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user;
  },

  async getItem(key) {
    const client = await this._client();
    const user = await this.getUser();
    if (!user) return null;

    const { data, error } = await client
      .from('user_data')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error(`db.getItem(${key}) failed:`, error.message);
      return null;
    }
    return data ? data.value : null;
  },

  async setItem(key, value) {
    const client = await this._client();
    const user = await this.getUser();
    if (!user) throw new Error('Not signed in — cannot save data.');

    const { error } = await client
      .from('user_data')
      .upsert({ user_id: user.id, key, value }, { onConflict: 'user_id,key' });

    if (error) {
      console.error(`db.setItem(${key}) failed:`, error.message);
      throw error;
    }
  },

  async removeItem(key) {
    const client = await this._client();
    const user = await this.getUser();
    if (!user) return;

    const { error } = await client
      .from('user_data')
      .delete()
      .eq('user_id', user.id)
      .eq('key', key);

    if (error) console.error(`db.removeItem(${key}) failed:`, error.message);
  },
};

const auth = {
  async signUp(email, password) {
    const client = await db._client();
    return client.auth.signUp({ email, password });
  },

  async signIn(email, password) {
    const client = await db._client();
    return client.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    const client = await db._client();
    await client.auth.signOut();
    window.location.href = 'login.html';
  },

  async requireAuth() {
    const user = await db.getUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    return user;
  },
};

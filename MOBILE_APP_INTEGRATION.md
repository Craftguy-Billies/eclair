# Integrating Eclair Backend into Your Mobile App

This guide shows you how to use your Eclair backend in a **React Native** or **Swift (iOS)** app.

---

## 📋 What You Have

- **Backend API**: `https://eclair-b7zo.vercel.app`
- **Firebase Project**: `eclair-e2b3e`
- **Endpoints Available**:
  - 🤖 AI Chat: `POST /api/ai/chat` (No auth)
  - 📁 Workspaces: `POST/GET/PUT/DELETE /api/workspaces` (Firebase auth)
  - 📝 Notes: `POST/GET/PUT/DELETE /api/notes` (Firebase auth)
  - 🌐 Web Summary: `POST /api/web-summary/summarize` (No auth)

---

## 🚀 Option 1: React Native Integration

### Step 1: Install Dependencies

```bash
npm install @react-native-firebase/app @react-native-firebase/auth
npm install @react-native-google-signin/google-signin
npm install axios  # For API calls
```

### Step 2: Firebase Configuration

#### 2.1 Download Firebase Config Files

Go to Firebase Console: https://console.firebase.google.com/project/eclair-e2b3e/settings/general

**For Android:**
- Download `google-services.json`
- Place in `android/app/google-services.json`

**For iOS:**
- Download `GoogleService-Info.plist`
- Place in `ios/YourAppName/GoogleService-Info.plist`

#### 2.2 Configure Google Sign-In

Get your **Web Client ID** from Firebase Console:
https://console.firebase.google.com/project/eclair-e2b3e/settings/general

Look for "Web client ID" under OAuth 2.0 Client IDs.

### Step 3: Create API Service

Create `src/services/eclairApi.js`:

```javascript
import axios from 'axios';
import auth from '@react-native-firebase/auth';

const API_BASE_URL = 'https://eclair-b7zo.vercel.app';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add Firebase token to requests automatically
api.interceptors.request.use(async (config) => {
  const user = auth().currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const eclairApi = {
  // ===== AI ENDPOINTS (No auth needed) =====
  
  /**
   * Chat with AI
   * @param {string} prompt - User's message
   * @param {number} temperature - 0.0 to 1.0 (creativity)
   * @returns {Promise} Streaming response
   */
  async chatWithAI(prompt, temperature = 0.7) {
    const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, temperature }),
    });
    
    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              fullResponse += data.content;
              // You can emit events here for real-time UI updates
            }
            if (data.finished) {
              return fullResponse;
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    }
    
    return fullResponse;
  },

  /**
   * Generate note from AI
   * @param {string} prompt - User's input
   * @param {string} action - 'improve', 'summarize', 'expand'
   */
  async generateNote(prompt, action = 'improve') {
    const response = await api.post('/api/ai/generate-note', {
      prompt,
      action,
      temperature: 0.7,
    });
    return response.data;
  },

  /**
   * Summarize text with AI
   */
  async summarizeText(text) {
    const response = await api.post('/api/ai/summarize', {
      text,
      temperature: 0.5,
    });
    return response.data;
  },

  // ===== WEB SUMMARY ENDPOINTS (No auth needed) =====

  /**
   * Extract and summarize web page
   * @param {string} url - Web page URL
   */
  async summarizeWebPage(url) {
    const response = await api.post('/api/web-summary/summarize', { url });
    return response.data;
  },

  // ===== WORKSPACE ENDPOINTS (Firebase auth required) =====

  /**
   * Get all workspaces for current user
   */
  async getWorkspaces() {
    const response = await api.get('/api/workspaces');
    return response.data.workspaces;
  },

  /**
   * Create new workspace
   * @param {Object} workspace - { name, description, icon, color }
   */
  async createWorkspace(workspace) {
    const response = await api.post('/api/workspaces', workspace);
    return response.data.workspace;
  },

  /**
   * Update workspace
   */
  async updateWorkspace(workspaceId, updates) {
    const response = await api.put(`/api/workspaces/${workspaceId}`, updates);
    return response.data.workspace;
  },

  /**
   * Delete workspace
   */
  async deleteWorkspace(workspaceId) {
    const response = await api.delete(`/api/workspaces/${workspaceId}`);
    return response.data;
  },

  // ===== NOTES ENDPOINTS (Firebase auth required) =====

  /**
   * Get all notes for current user
   */
  async getNotes(workspaceId = null) {
    const params = workspaceId ? { workspaceId } : {};
    const response = await api.get('/api/notes', { params });
    return response.data.notes;
  },

  /**
   * Create new note
   * @param {Object} note - { title, content, workspaceId?, tags? }
   */
  async createNote(note) {
    const response = await api.post('/api/notes', note);
    return response.data.note;
  },

  /**
   * Update note
   */
  async updateNote(noteId, updates) {
    const response = await api.put(`/api/notes/${noteId}`, updates);
    return response.data.note;
  },

  /**
   * Delete note
   */
  async deleteNote(noteId) {
    const response = await api.delete(`/api/notes/${noteId}`);
    return response.data;
  },

  /**
   * Search notes
   */
  async searchNotes(query) {
    const response = await api.get(`/api/notes/search`, {
      params: { query },
    });
    return response.data.notes;
  },
};

export default eclairApi;
```

### Step 4: Authentication Setup

Create `src/services/auth.js`:

```javascript
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID', // From Firebase Console
});

export const authService = {
  /**
   * Sign in with Google
   */
  async signInWithGoogle() {
    try {
      // Check if device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      
      // Get Google credentials
      const { idToken } = await GoogleSignin.signIn();
      
      // Create Firebase credential
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      
      // Sign in with Firebase
      const userCredential = await auth().signInWithCredential(googleCredential);
      
      return userCredential.user;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  },

  /**
   * Sign out
   */
  async signOut() {
    try {
      await GoogleSignin.signOut();
      await auth().signOut();
    } catch (error) {
      console.error('Sign Out Error:', error);
      throw error;
    }
  },

  /**
   * Get current user
   */
  getCurrentUser() {
    return auth().currentUser;
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChanged(callback) {
    return auth().onAuthStateChanged(callback);
  },
};

export default authService;
```

### Step 5: Example Usage in Component

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import authService from './services/auth';
import eclairApi from './services/eclairApi';

export default function HomeScreen() {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [aiResponse, setAiResponse] = useState('');

  useEffect(() => {
    // Listen for auth changes
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        loadWorkspaces();
      }
    });

    return unsubscribe;
  }, []);

  const handleSignIn = async () => {
    try {
      await authService.signInWithGoogle();
      // User state will update via onAuthStateChanged
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const loadWorkspaces = async () => {
    try {
      const data = await eclairApi.getWorkspaces();
      setWorkspaces(data);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    }
  };

  const createWorkspace = async () => {
    try {
      const newWorkspace = await eclairApi.createWorkspace({
        name: 'My New Workspace',
        description: 'Created from mobile app',
        icon: '📱',
        color: '#667eea',
      });
      setWorkspaces([...workspaces, newWorkspace]);
    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  };

  const chatWithAI = async () => {
    try {
      const response = await eclairApi.chatWithAI(
        'Tell me a fun fact about AI',
        0.7
      );
      setAiResponse(response);
    } catch (error) {
      console.error('AI chat failed:', error);
    }
  };

  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Welcome to Eclair</Text>
        <Button title="Sign In with Google" onPress={handleSignIn} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text>Welcome, {user.displayName}!</Text>
      <Button title="Sign Out" onPress={handleSignOut} />
      
      <Button title="Chat with AI" onPress={chatWithAI} />
      {aiResponse && <Text>{aiResponse}</Text>}
      
      <Button title="Create Workspace" onPress={createWorkspace} />
      
      <FlatList
        data={workspaces}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View>
            <Text>{item.icon} {item.name}</Text>
          </View>
        )}
      />
    </View>
  );
}
```

---

## 🍎 Option 2: Swift (iOS) Integration

### Step 1: Install Firebase SDK

Add to your `Podfile`:

```ruby
pod 'Firebase/Auth'
pod 'GoogleSignIn'
```

Then run:
```bash
pod install
```

### Step 2: Configure Firebase

1. Download `GoogleService-Info.plist` from Firebase Console
2. Add it to your Xcode project root
3. In `AppDelegate.swift`:

```swift
import Firebase
import GoogleSignIn

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()
        return true
    }
    
    func application(_ app: UIApplication,
                     open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return GIDSignIn.sharedInstance.handle(url)
    }
}
```

### Step 3: Create API Service

Create `EclairAPI.swift`:

```swift
import Foundation
import Firebase

class EclairAPI {
    static let shared = EclairAPI()
    private let baseURL = "https://eclair-b7zo.vercel.app"
    
    // MARK: - Get Firebase Token
    private func getAuthToken() async throws -> String? {
        guard let user = Auth.auth().currentUser else {
            return nil
        }
        return try await user.getIDToken()
    }
    
    // MARK: - AI Endpoints
    
    func chatWithAI(prompt: String, temperature: Double = 0.7) async throws -> String {
        let url = URL(string: "\(baseURL)/api/ai/chat")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = [
            "prompt": prompt,
            "temperature": temperature
        ] as [String : Any]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        
        // Handle streaming response
        let text = String(data: data, encoding: .utf8) ?? ""
        // Parse SSE format here
        return text
    }
    
    // MARK: - Workspace Endpoints
    
    func getWorkspaces() async throws -> [Workspace] {
        let url = URL(string: "\(baseURL)/api/workspaces")!
        var request = URLRequest(url: url)
        
        if let token = try await getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(WorkspacesResponse.self, from: data)
        return response.workspaces
    }
    
    func createWorkspace(name: String, description: String, icon: String, color: String) async throws -> Workspace {
        let url = URL(string: "\(baseURL)/api/workspaces")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = try await getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let body: [String: Any] = [
            "name": name,
            "description": description,
            "icon": icon,
            "color": color
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(WorkspaceCreateResponse.self, from: data)
        return response.workspace
    }
    
    func deleteWorkspace(id: String) async throws {
        let url = URL(string: "\(baseURL)/api/workspaces/\(id)")!
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        
        if let token = try await getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (_, _) = try await URLSession.shared.data(for: request)
    }
    
    // MARK: - Notes Endpoints
    
    func getNotes(workspaceId: String? = nil) async throws -> [Note] {
        var urlString = "\(baseURL)/api/notes"
        if let workspaceId = workspaceId {
            urlString += "?workspaceId=\(workspaceId)"
        }
        
        let url = URL(string: urlString)!
        var request = URLRequest(url: url)
        
        if let token = try await getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(NotesResponse.self, from: data)
        return response.notes
    }
    
    func createNote(title: String, content: String, workspaceId: String?) async throws -> Note {
        let url = URL(string: "\(baseURL)/api/notes")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = try await getAuthToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        var body: [String: Any] = [
            "title": title,
            "content": content
        ]
        if let workspaceId = workspaceId {
            body["workspaceId"] = workspaceId
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, _) = try await URLSession.shared.data(for: request)
        let response = try JSONDecoder().decode(NoteCreateResponse.self, from: data)
        return response.note
    }
}

// MARK: - Models

struct Workspace: Codable {
    let id: String
    let name: String
    let description: String
    let icon: String
    let color: String
    let noteCount: Int
    let createdAt: String
}

struct WorkspacesResponse: Codable {
    let workspaces: [Workspace]
}

struct WorkspaceCreateResponse: Codable {
    let workspace: Workspace
}

struct Note: Codable {
    let id: String
    let title: String
    let content: String
    let workspaceId: String?
    let createdAt: String
}

struct NotesResponse: Codable {
    let notes: [Note]
}

struct NoteCreateResponse: Codable {
    let note: Note
}
```

### Step 4: Authentication Service

Create `AuthService.swift`:

```swift
import Firebase
import GoogleSignIn

class AuthService {
    static let shared = AuthService()
    
    func signInWithGoogle(presenting viewController: UIViewController) async throws -> User {
        guard let clientID = FirebaseApp.app()?.options.clientID else {
            throw NSError(domain: "AuthError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Missing client ID"])
        }
        
        let config = GIDConfiguration(clientID: clientID)
        GIDSignIn.sharedInstance.configuration = config
        
        let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: viewController)
        
        guard let idToken = result.user.idToken?.tokenString else {
            throw NSError(domain: "AuthError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Missing ID token"])
        }
        
        let credential = GoogleAuthProvider.credential(
            withIDToken: idToken,
            accessToken: result.user.accessToken.tokenString
        )
        
        let authResult = try await Auth.auth().signIn(with: credential)
        return authResult.user
    }
    
    func signOut() throws {
        GIDSignIn.sharedInstance.signOut()
        try Auth.auth().signOut()
    }
    
    func getCurrentUser() -> User? {
        return Auth.auth().currentUser
    }
}
```

### Step 5: Usage Example

```swift
import SwiftUI
import Firebase

struct ContentView: View {
    @State private var user: User?
    @State private var workspaces: [Workspace] = []
    @State private var aiResponse: String = ""
    
    var body: some View {
        NavigationView {
            if user == nil {
                // Sign In View
                VStack {
                    Text("Welcome to Eclair")
                        .font(.largeTitle)
                    
                    Button("Sign In with Google") {
                        signIn()
                    }
                    .buttonStyle(.borderedProminent)
                }
            } else {
                // Main View
                List {
                    Section("User") {
                        Text("Hello, \(user?.displayName ?? "")")
                        Button("Sign Out") {
                            signOut()
                        }
                    }
                    
                    Section("AI") {
                        Button("Chat with AI") {
                            Task {
                                await chatWithAI()
                            }
                        }
                        if !aiResponse.isEmpty {
                            Text(aiResponse)
                        }
                    }
                    
                    Section("Workspaces") {
                        Button("Create Workspace") {
                            Task {
                                await createWorkspace()
                            }
                        }
                        
                        ForEach(workspaces, id: \.id) { workspace in
                            HStack {
                                Text(workspace.icon)
                                Text(workspace.name)
                            }
                        }
                    }
                }
                .navigationTitle("Eclair")
            }
        }
        .onAppear {
            user = Auth.auth().currentUser
            if user != nil {
                Task {
                    await loadWorkspaces()
                }
            }
        }
    }
    
    func signIn() {
        guard let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let rootViewController = windowScene.windows.first?.rootViewController else {
            return
        }
        
        Task {
            do {
                user = try await AuthService.shared.signInWithGoogle(presenting: rootViewController)
                await loadWorkspaces()
            } catch {
                print("Sign in failed: \(error)")
            }
        }
    }
    
    func signOut() {
        do {
            try AuthService.shared.signOut()
            user = nil
            workspaces = []
        } catch {
            print("Sign out failed: \(error)")
        }
    }
    
    func loadWorkspaces() async {
        do {
            workspaces = try await EclairAPI.shared.getWorkspaces()
        } catch {
            print("Failed to load workspaces: \(error)")
        }
    }
    
    func createWorkspace() async {
        do {
            let workspace = try await EclairAPI.shared.createWorkspace(
                name: "My Workspace",
                description: "Created from iOS",
                icon: "📱",
                color: "#667eea"
            )
            workspaces.append(workspace)
        } catch {
            print("Failed to create workspace: \(error)")
        }
    }
    
    func chatWithAI() async {
        do {
            aiResponse = try await EclairAPI.shared.chatWithAI(
                prompt: "Tell me a fun fact",
                temperature: 0.7
            )
        } catch {
            print("AI chat failed: \(error)")
        }
    }
}
```

---

## 🔑 Key Points

### Authentication Flow
1. User signs in with Google → Gets Firebase User
2. App calls `user.getIdToken()` → Gets JWT token
3. App sends token in `Authorization: Bearer <token>` header
4. Backend verifies token with Firebase Admin SDK
5. Backend returns user-specific data

### Which Endpoints Need Auth?
- ✅ **No Auth**: `/api/ai/*`, `/api/web-summary/*`
- 🔒 **Auth Required**: `/api/workspaces/*`, `/api/notes/*`

### Token Refresh
- Firebase automatically refreshes tokens every hour
- Always call `getIdToken()` before making auth requests
- The interceptors in the code handle this automatically

---

## 📚 Complete API Reference

See all endpoints in your backend:
- `AUTH.md` - Authentication details
- `CLIENT_EXAMPLES.md` - More code examples
- `FIREBASE_SETUP.md` - Firebase configuration

Your backend is fully ready for production use! 🚀

# API Client Examples

This file contains examples of how to call your backend API from React Native and Swift.

## Your API Base URL
After deploying to Vercel, your URL will be:
```
https://your-project-name.vercel.app
```

---

## React Native Examples

### 1. AI Chat (Streaming Response)

```javascript
import { useState } from 'react';

const API_BASE_URL = 'https://your-project-name.vercel.app';

export const useChatAI = () => {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const chat = async (prompt) => {
    setLoading(true);
    setError(null);
    setResponse('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          temperature: 0.6,
          max_tokens: 4096 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.content) {
              setResponse(prev => prev + data.content);
            }
            
            if (data.finished) {
              // Use cleaned response without <think> blocks
              setResponse(data.fullResponse);
            }
            
            if (data.error) {
              throw new Error(data.message || 'AI service error');
            }
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { response, loading, error, chat };
};

// Usage in component:
// const { response, loading, error, chat } = useChatAI();
// await chat('Tell me about AI');
```

### 2. Generate/Expand Notes

```javascript
export const generateNote = async (prompt, context = '', action = 'generate') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/generate-note`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt,
        context,
        action // 'generate', 'expand', or 'summarize'
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate note');
    }

    // Handle streaming response (same as chat example)
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.finished) {
            fullText = data.fullResponse;
          }
        }
      }
    }

    return fullText;
  } catch (error) {
    console.error('Generate note error:', error);
    throw error;
  }
};

// Usage:
// const note = await generateNote('Write about quantum computing', '', 'generate');
```

### 3. Web Summarization

```javascript
export const summarizeWebPage = async (url, summaryType = 'general') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/web-summary/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        url,
        summary_type: summaryType // 'general', 'bullet_points', 'brief', or 'detailed'
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to summarize web page');
    }

    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let summary = '';
    let metadata = {};

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          
          if (data.status) {
            console.log('Status:', data.message);
          }
          
          if (data.finished) {
            summary = data.fullResponse;
            metadata = data.metadata;
          }
        }
      }
    }

    return { summary, metadata };
  } catch (error) {
    console.error('Web summary error:', error);
    throw error;
  }
};

// Usage:
// const { summary, metadata } = await summarizeWebPage('https://example.com', 'bullet_points');
```

### 4. Notes CRUD Operations (Requires Firebase Auth)

```javascript
import auth from '@react-native-firebase/auth';

// Get auth token
const getAuthToken = async () => {
  const user = auth().currentUser;
  if (!user) throw new Error('User not authenticated');
  return await user.getIdToken();
};

// Create note
export const createNote = async (noteData) => {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(noteData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create note');
    }

    return await response.json();
  } catch (error) {
    console.error('Create note error:', error);
    throw error;
  }
};

// Get all notes
export const getNotes = async (limit = 50) => {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(
      `${API_BASE_URL}/api/notes?limit=${limit}&orderBy=updatedAt&orderDirection=desc`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch notes');
    }

    const data = await response.json();
    return data.notes;
  } catch (error) {
    console.error('Get notes error:', error);
    throw error;
  }
};

// Update note
export const updateNote = async (noteId, updates) => {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update note');
    }

    return await response.json();
  } catch (error) {
    console.error('Update note error:', error);
    throw error;
  }
};

// Delete note
export const deleteNote = async (noteId) => {
  try {
    const token = await getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/api/notes/${noteId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete note');
    }

    return await response.json();
  } catch (error) {
    console.error('Delete note error:', error);
    throw error;
  }
};
```

---

## Swift Examples

### 1. AI Chat (Streaming Response)

```swift
import Foundation

class AIService {
    private let baseURL = "https://your-project-name.vercel.app"
    
    func chatWithAI(prompt: String, completion: @escaping (Result<String, Error>) -> Void) {
        guard let url = URL(string: "\(baseURL)/api/ai/chat") else {
            completion(.failure(NSError(domain: "Invalid URL", code: -1)))
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "prompt": prompt,
            "temperature": 0.6,
            "max_tokens": 4096
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        let task = URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let data = data else {
                completion(.failure(NSError(domain: "No data", code: -1)))
                return
            }
            
            // Parse streaming response
            let text = String(data: data, encoding: .utf8) ?? ""
            let lines = text.components(separatedBy: "\n")
            var fullResponse = ""
            
            for line in lines {
                if line.hasPrefix("data: ") {
                    let jsonString = String(line.dropFirst(6))
                    if let jsonData = jsonString.data(using: .utf8),
                       let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                        
                        if let finished = json["finished"] as? Bool, finished,
                           let response = json["fullResponse"] as? String {
                            fullResponse = response
                        }
                    }
                }
            }
            
            completion(.success(fullResponse))
        }
        
        task.resume()
    }
}

// Usage:
// let aiService = AIService()
// aiService.chatWithAI(prompt: "Tell me about AI") { result in
//     switch result {
//     case .success(let response):
//         print(response)
//     case .failure(let error):
//         print("Error: \(error)")
//     }
// }
```

### 2. Web Summarization

```swift
func summarizeWebPage(url: String, summaryType: String = "general", completion: @escaping (Result<String, Error>) -> Void) {
    guard let apiURL = URL(string: "\(baseURL)/api/web-summary/summarize") else {
        completion(.failure(NSError(domain: "Invalid URL", code: -1)))
        return
    }
    
    var request = URLRequest(url: apiURL)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let body: [String: Any] = [
        "url": url,
        "summary_type": summaryType
    ]
    
    request.httpBody = try? JSONSerialization.data(withJSONObject: body)
    
    let task = URLSession.shared.dataTask(with: request) { data, response, error in
        if let error = error {
            completion(.failure(error))
            return
        }
        
        guard let data = data else {
            completion(.failure(NSError(domain: "No data", code: -1)))
            return
        }
        
        // Parse streaming response (similar to chat example)
        let text = String(data: data, encoding: .utf8) ?? ""
        let lines = text.components(separatedBy: "\n")
        var summary = ""
        
        for line in lines {
            if line.hasPrefix("data: ") {
                let jsonString = String(line.dropFirst(6))
                if let jsonData = jsonString.data(using: .utf8),
                   let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
                   let finished = json["finished"] as? Bool, finished,
                   let response = json["fullResponse"] as? String {
                    summary = response
                }
            }
        }
        
        completion(.success(summary))
    }
    
    task.resume()
}

// Usage:
// summarizeWebPage(url: "https://example.com", summaryType: "bullet_points") { result in
//     switch result {
//     case .success(let summary):
//         print(summary)
//     case .failure(let error):
//         print("Error: \(error)")
//     }
// }
```

### 3. Notes with Firebase Auth

```swift
import FirebaseAuth

class NotesService {
    private let baseURL = "https://your-project-name.vercel.app"
    
    private func getAuthToken() async throws -> String {
        guard let user = Auth.auth().currentUser else {
            throw NSError(domain: "User not authenticated", code: -1)
        }
        return try await user.getIDToken()
    }
    
    func createNote(title: String, content: String, tags: [String] = []) async throws -> [String: Any] {
        let token = try await getAuthToken()
        
        guard let url = URL(string: "\(baseURL)/api/notes") else {
            throw NSError(domain: "Invalid URL", code: -1)
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let body: [String: Any] = [
            "title": title,
            "content": content,
            "tags": tags
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 201 else {
            throw NSError(domain: "Failed to create note", code: -1)
        }
        
        return try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
    }
    
    func getNotes(limit: Int = 50) async throws -> [[String: Any]] {
        let token = try await getAuthToken()
        
        guard let url = URL(string: "\(baseURL)/api/notes?limit=\(limit)") else {
            throw NSError(domain: "Invalid URL", code: -1)
        }
        
        var request = URLRequest(url: url)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        return json?["notes"] as? [[String: Any]] ?? []
    }
}

// Usage:
// let notesService = NotesService()
// Task {
//     do {
//         let note = try await notesService.createNote(
//             title: "My Note",
//             content: "Hello world",
//             tags: ["important"]
//         )
//         print("Created note:", note)
//     } catch {
//         print("Error:", error)
//     }
// }
```

---

## About ALLOWED_ORIGINS and ADMIN_API_KEY

### ALLOWED_ORIGINS
- **What it is**: A security setting that restricts which domains can call your API
- **For now**: Leave it EMPTY (or don't set it)
- **Why**: During development, you want your mobile apps to access the API freely
- **Later**: When you deploy your mobile app and have a web version, add those domains:
  ```
  ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
  ```

### ADMIN_API_KEY
- **What it is**: A password for accessing monitoring endpoints (like `/api/monitoring/stats`)
- **For now**: Leave it EMPTY
- **Why**: You don't need monitoring during initial development
- **Later**: If you want to check API usage stats, generate a secure key:
  ```bash
  npm run generate-keys
  ```
  Then add the generated key to `ADMIN_API_KEY`

## Quick Start Checklist

1. ✅ Copy the `.env` file values to Vercel environment variables
2. ✅ Deploy to Vercel
3. ✅ Replace `https://your-project-name.vercel.app` in client code with your actual Vercel URL
4. ✅ Test the API endpoints from your mobile app
5. ⏸️ Leave `ALLOWED_ORIGINS` empty for now
6. ⏸️ Leave `ADMIN_API_KEY` empty for now

/**
 * 🚀 CODE EXECUTION SERVICE
 * Сервис для работы с профессиональной системой выполнения кода
 */

// 🎨 Типы для языков программирования
export interface SupportedLanguage {
  id: string;
  name: string;
  extension: string;
  supports_classes: boolean;
}

export interface LanguagesResponse {
  supported_languages: SupportedLanguage[];
}

// 🎨 Типы для шаблонов кода
export interface CodeTemplatesResponse {
  problem_slug: string;
  function_name: string;
  templates: Record<string, string>;
  supported_languages: string[];
}

export interface ExampleTemplatesResponse {
  problem: string;
  description: string;
  templates: Record<string, string>;
  example_usage: {
    input: string;
    output: string;
  };
}

// 🏆 Типы для отправки решений
export interface SubmissionRequest {
  code: string;
  language: string;
}

export interface SubmissionResponse {
  submission_id: string | null;
  status: string;
  passed_tests: number;
  total_tests: number;
  execution_time: string;
  memory_usage: string;
  score: number;
  error_message: string;
  accepted: boolean;
}

// 🧪 Типы для выполнения кода
export interface TestCaseResult {
  test_case_index: number;
  passed: boolean;
  input_data: any;
  expected_output: any;
  actual_output: any;
  execution_time: number;
  error_message?: string;
  hidden: boolean;
}

export interface CodeRunResult {
  success: boolean;
  results: TestCaseResult[];
  runtime_ms: number;
  memory_mb: number;
  error?: string;
}

/**
 * 🎯 ОСНОВНОЙ КЛАСС СЕРВИСА
 */
export class CodeExecutionService {
  private baseUrl = 'http://localhost:8003/api/v1/problems';

  /**
   * 📋 Получить список поддерживаемых языков программирования
   */
  async getSupportedLanguages(): Promise<SupportedLanguage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/languages`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: LanguagesResponse = await response.json();
      return data.supported_languages;
    } catch (error) {
      console.error('Failed to fetch supported languages:', error);
      // Возвращаем fallback список языков
      return this.getFallbackLanguages();
    }
  }

  /**
   * 🎨 Получить шаблоны кода для конкретной задачи
   */
  async getCodeTemplates(problemSlug: string, authToken?: string): Promise<CodeTemplatesResponse | null> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${this.baseUrl}/templates/${problemSlug}`, {
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        if (response.status === 404) {
          throw new Error('Problem not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch code templates:', error);
      return null;
    }
  }

  /**
   * 🎨 Получить примеры шаблонов кода для демонстрации
   */
  async getExampleTemplates(): Promise<ExampleTemplatesResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/examples/templates`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch example templates:', error);
      return null;
    }
  }

  /**
   * 🏆 Отправить решение задачи
   */
  async submitSolution(
    problemSlug: string,
    submissionData: SubmissionRequest,
    authToken: string
  ): Promise<SubmissionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/submit/${problemSlug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        if (response.status === 404) {
          throw new Error('Problem not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to submit solution:', error);
      // Возвращаем ошибку как валидный ответ
      return {
        submission_id: null,
        status: 'Internal Error',
        passed_tests: 0,
        total_tests: 0,
        execution_time: '0.000s',
        memory_usage: '0KB',
        score: 0.0,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        accepted: false,
      };
    }
  }

  /**
   * 🧪 Выполнить код (для тестирования без отправки)
   */
  async runCode(
    problemSlug: string,
    submissionData: SubmissionRequest,
    authToken: string
  ): Promise<CodeRunResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${problemSlug}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        if (response.status === 404) {
          throw new Error('Problem not found');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to run code:', error);
      return null;
    }
  }

  /**
   * 🎯 Получить статус по цвету
   */
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'accepted':
        return 'text-green-600';
      case 'wrong answer':
        return 'text-red-600';
      case 'time limit exceeded':
        return 'text-yellow-600';
      case 'memory limit exceeded':
        return 'text-orange-600';
      case 'runtime error':
        return 'text-purple-600';
      case 'compilation error':
        return 'text-pink-600';
      default:
        return 'text-gray-600';
    }
  }

  /**
   * 🎯 Получить иконку для статуса
   */
  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'accepted':
        return '✅';
      case 'wrong answer':
        return '❌';
      case 'time limit exceeded':
        return '⏰';
      case 'memory limit exceeded':
        return '🧠';
      case 'runtime error':
        return '💥';
      case 'compilation error':
        return '🔧';
      default:
        return '❓';
    }
  }

  /**
   * 📋 Fallback список языков на случай ошибки API
   */
  private getFallbackLanguages(): SupportedLanguage[] {
    return [
      { id: 'python', name: 'Python', extension: '.py', supports_classes: true },
      { id: 'java', name: 'Java', extension: '.java', supports_classes: true },
      { id: 'cpp', name: 'C++', extension: '.cpp', supports_classes: true },
      { id: 'javascript', name: 'JavaScript', extension: '.js', supports_classes: false },
      { id: 'typescript', name: 'TypeScript', extension: '.ts', supports_classes: false },
      { id: 'go', name: 'Go', extension: '.go', supports_classes: false },
      { id: 'rust', name: 'Rust', extension: '.rs', supports_classes: true },
      { id: 'c', name: 'C', extension: '.c', supports_classes: false },
    ];
  }

  /**
   * 🎨 Получить настройки Monaco Editor для языка
   */
  getMonacoLanguage(languageId: string): string {
    const mapping: Record<string, string> = {
      'python': 'python',
      'python3': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'javascript': 'javascript',
      'typescript': 'typescript',
      'go': 'go',
      'rust': 'rust',
    };
    return mapping[languageId] || 'plaintext';
  }

  /**
   * 🎨 Получить тему для языка программирования
   */
  getLanguageTheme(): string {
    // Return a default theme since we're not using language-specific themes
    return 'vs-dark';
  }
}

// 🌟 Глобальный экземпляр сервиса
export const codeExecutionService = new CodeExecutionService(); 
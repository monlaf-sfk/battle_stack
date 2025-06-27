import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Plus, Trash2, Tag as TagIcon } from 'lucide-react';

interface Tag {
  id: string;
  name: string;
  description?: string;
}

interface TagManagerProps {
  tags: Tag[];
  onCreateTag: (tag: { name: string; description?: string }) => Promise<void>;
  onDeleteTag: (tagId: string) => Promise<void>;
  onRefresh: () => void;
}

export const TagManager: React.FC<TagManagerProps> = ({
  tags,
  onCreateTag,
  onDeleteTag,
  onRefresh
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTag, setNewTag] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newTag.name.trim()) return;

    setCreating(true);
    try {
      await onCreateTag({
        name: newTag.name.trim(),
        description: newTag.description.trim() || undefined
      });
      setNewTag({ name: '', description: '' });
      setShowCreateForm(false);
      onRefresh();
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (tagId: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;
    
    await onDeleteTag(tagId);
    onRefresh();
  };

  const popularTags = [
    'Array', 'Hash Table', 'Dynamic Programming', 'Tree', 'Graph',
    'Binary Search', 'Two Pointers', 'Sliding Window', 'Stack', 'Queue',
    'Heap', 'Backtracking', 'Greedy', 'Divide and Conquer', 'Trie',
    'Binary Tree', 'Linked List', 'String', 'Math', 'Bit Manipulation'
  ];

  const quickAddTag = async (tagName: string) => {
    await onCreateTag({ name: tagName });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TagIcon size={20} />
          Tag Management
        </h3>
        <Button
          onClick={() => setShowCreateForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus size={16} className="mr-1" />
          Add Tag
        </Button>
      </div>

      {/* Quick Add Popular Tags */}
      <Card>
        <div className="p-4">
          <h4 className="font-medium mb-3">Quick Add Popular Tags</h4>
          <div className="flex flex-wrap gap-2">
            {popularTags
              .filter(tag => !tags.some(t => t.name === tag))
              .map((tag) => (
                <button
                  key={tag}
                  onClick={() => quickAddTag(tag)}
                  className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors"
                >
                  + {tag}
                </button>
              ))}
          </div>
        </div>
      </Card>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <div className="p-4">
            <h4 className="font-medium mb-3">Create New Tag</h4>
            <div className="space-y-3">
              <Input
                placeholder="Tag name"
                value={newTag.name}
                onChange={(e) => setNewTag(prev => ({ ...prev, name: e.target.value }))}
              />
              <Input
                placeholder="Description (optional)"
                value={newTag.description}
                onChange={(e) => setNewTag(prev => ({ ...prev, description: e.target.value }))}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleCreate}
                  disabled={creating || !newTag.name.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {creating ? 'Creating...' : 'Create'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewTag({ name: '', description: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Existing Tags */}
      <Card>
        <div className="p-4">
          <h4 className="font-medium mb-3">Existing Tags ({tags.length})</h4>
          {tags.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No tags created yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{tag.name}</div>
                    {tag.description && (
                      <div className="text-sm text-gray-500">{tag.description}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(tag.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}; 
import { useState } from "react";
import { FolderPlus } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Input } from "@lootlog/ui/components/input";

interface AddCategoryFormProps {
  onAddCategory: (categoryName: string) => void;
}

export const AddCategoryForm = ({ onAddCategory }: AddCategoryFormProps) => {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setNewCategoryName("");
      setIsAddingCategory(false);
    }
  };

  if (isAddingCategory) {
    return (
      <div className="flex items-center gap-2 bg-card border rounded-lg p-3 mt-2">
        <Input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAddCategory();
            } else if (e.key === "Escape") {
              setIsAddingCategory(false);
              setNewCategoryName("");
            }
          }}
          placeholder="Nazwa nowej kategorii..."
          className="flex-1 h-8"
          autoFocus
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddCategory}
          className="h-8 px-3"
        >
          Dodaj
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setIsAddingCategory(false);
            setNewCategoryName("");
          }}
          className="h-8 px-3"
        >
          Anuluj
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={() => setIsAddingCategory(true)}
      className="w-full gap-2 mt-2"
    >
      <FolderPlus className="h-4 w-4" />
      Dodaj kategorię
    </Button>
  );
};

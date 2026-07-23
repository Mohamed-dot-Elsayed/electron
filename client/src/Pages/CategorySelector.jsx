// components/CategorySelector.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const CategorySelector = ({ categories, selectedCategory, onCategorySelect }) => {
      const { t } = useTranslation();
  
  if (categories.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
{t("NoCategoriesFound")}      </div>
    );
  }

  return (
    <div className="flex flex-nowrap w-full space-x-4 pb-4 overflow-x-auto">
      {/* "Favorite" button بدل "All" */}
      <div className="flex-shrink-0">
        <Button
          onClick={() => onCategorySelect("all")}
          className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[80px] h-[100px] transition-all ${
            selectedCategory === "all"
              ? "bg-bg-primary text-white hover:bg-purple-700"
              : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <div className="w-10 h-10 mb-1 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-2xl">
              {selectedCategory === "all" ? "❤️" : "🤍"}
            </span>
          </div>
          <span className="text-sm font-semibold">{t("Favorite")}</span>
        </Button>
      </div>

      {/* Dynamic categories */}
      {categories.map((category) => (
        <div key={category.id} className="flex-shrink-0">
          <Button
            onClick={() => onCategorySelect(category.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[80px] h-[100px] transition-all ${
              selectedCategory === category.id
                ? "bg-bg-primary text-white hover:bg-purple-700"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <img
              src={category.image_link || "https://via.placeholder.com/40"}
              alt={category.name}
              className="w-10 h-10 mb-1 rounded-full object-cover"

            />
            <span className="text-sm font-semibold capitalize text-center">
              {category.name}
            </span>
          </Button>
        </div>
      ))}
    </div>
  );
};

export default CategorySelector;
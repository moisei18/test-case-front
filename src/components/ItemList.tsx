import React, { useState, useEffect, useRef } from "react";

interface Item {
  id: number;
}

export default function ItemList() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const loadItems = async (
    page: number,
    search: string,
    append: boolean = true
  ) => {
    if (loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const response = await fetch(
        `https://test-case-back-production.up.railway.app/items?page=${page}&search=${search}`
      );
      const data = await response.json();

      if (append && page > 1) {
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }

      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Ошибка загрузки:", error);
    }

    setLoading(false);
    loadingRef.current = false;
  };

  const loadSelected = async () => {
    try {
      const response = await fetch(
        "https://test-case-back-production.up.railway.app/selected"
      );
      const selected = await response.json();
      setSelectedIds(new Set(selected));
    } catch (error) {
      console.error("Ошибка загрузки выбранных:", error);
    }
  };

  const saveSelected = async (selected: Set<number>) => {
    try {
      await fetch("https://test-case-back-production.up.railway.app/selected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected: Array.from(selected) }),
      });
    } catch (error) {
      console.error("Ошибка сохранения выбранных:", error);
    }
  };

  useEffect(() => {
    loadSelected();
    loadItems(1, "");
  }, []);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    setHasMore(true);
    loadItems(1, value, false);
  };

  const toggleSelect = (id: number) => {
    const newSelected = new Set(selectedIds);

    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }

    setSelectedIds(newSelected);
    saveSelected(newSelected);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    if (scrollHeight - scrollTop <= clientHeight + 100 && hasMore && !loading) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      loadItems(nextPage, searchTerm, true);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();

    if (!draggedItem || draggedItem === targetId) return;

    const fromIndex = items.findIndex((item) => item.id === draggedItem);
    const toIndex = items.findIndex((item) => item.id === targetId);

    if (fromIndex === -1 || toIndex === -1) return;

    const newItems = [...items];
    const [movedItem] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, movedItem);
    setItems(newItems);

    try {
      await fetch("https://test-case-back-production.up.railway.app/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromIndex, toIndex }),
      });
    } catch (error) {
      console.error("Ошибка сортировки:", error);
    }

    setDraggedItem(null);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-900 text-white rounded-lg">
      <h1 className="text-3xl font-bold mb-6">Список элементов</h1>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Поиск по номеру..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 outline-none"
        />
      </div>

      <div className="mb-4 flex justify-between text-gray-300">
        <span>Выбрано: {selectedIds.size}</span>
        <span>Показано: {items.length}</span>
      </div>

      <div
        ref={containerRef}
        className="border border-gray-700 rounded-lg overflow-auto"
        style={{ height: "1000px" }}
        onScroll={handleScroll}
      >
        {items.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, item.id)}
            className={`flex items-center p-4 border-b border-gray-700 hover:bg-gray-800 cursor-move transition-colors ${
              draggedItem === item.id ? "opacity-50" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(item.id)}
              onChange={() => toggleSelect(item.id)}
              className="w-4 h-4 mr-4 accent-blue-500"
            />
            <span className="text-lg">Элемент {item.id}</span>
          </div>
        ))}

        {loading && (
          <div className="p-4 text-center text-gray-400">Загружаем...</div>
        )}

        {!hasMore && items.length > 0 && (
          <div className="p-4 text-center text-gray-500">
            Все элементы загружены
          </div>
        )}

        {items.length === 0 && !loading && (
          <div className="p-8 text-center text-gray-500">
            Элементы не найдены
          </div>
        )}
      </div>
    </div>
  );
}

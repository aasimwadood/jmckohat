"use client";

import { useState } from "react";
import { Download, FileText, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type DownloadCategory = { id: string; name: string };
export type DownloadDoc = {
  id: string;
  category_id: string | null;
  title: string;
  uploaded_at: string;
  url: string;
  sizeLabel: string;
};

export function DownloadBrowser({
  categories,
  documents,
}: {
  categories: DownloadCategory[];
  documents: DownloadDoc[];
}) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <>
      <section className="border-b bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-2xl">
            <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue={categories[0]?.id} className="w-full">
            <TabsList className="mb-8 grid w-full grid-cols-2 lg:grid-cols-5">
              {categories.map((category) => (
                <TabsTrigger key={category.id} value={category.id}>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((category) => (
              <TabsContent key={category.id} value={category.id}>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {documents
                    .filter((d) => d.category_id === category.id)
                    .filter(
                      (doc) => searchQuery === "" || doc.title.toLowerCase().includes(searchQuery.toLowerCase()),
                    )
                    .map((doc) => (
                      <Card key={doc.id} className="transition-shadow hover:shadow-lg">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="mb-3 flex items-start gap-3">
                                <FileText className="h-10 w-10 flex-shrink-0 text-blue-600" />
                                <div>
                                  <h3 className="mb-1 text-gray-900">{doc.title}</h3>
                                  <div className="flex items-center gap-3 text-sm text-gray-500">
                                    <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                    {doc.sizeLabel && (
                                      <>
                                        <span>•</span>
                                        <span>{doc.sizeLabel}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" className="flex items-center gap-2" asChild>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                                Download
                              </a>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </section>
    </>
  );
}

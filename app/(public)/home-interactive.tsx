"use client";

import { useState } from "react";
import { ArrowRight, Calendar, GraduationCap, Users, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageWithFallback } from "@/components/shared/image-with-fallback";

type Leader = { title: string; name: string; designation: string; image?: string; message: string; fullMessage: string };
type Faculty = {
  id: string;
  name: string;
  dean: string;
  description: string;
  image?: string;
  color: string;
  programs: string[];
  fullDetail: string;
};
type NewsItem = { id: string; title: string; date: string; category: string; fullMessage: string };

type DialogContentState =
  | ({ type: "message" } & Leader)
  | ({ type: "faculty" } & Faculty)
  | ({ type: "news" } & NewsItem)
  | null;

export function LeadershipMessages({ leaders }: { leaders: Leader[] }) {
  const [dialogContent, setDialogContent] = useState<DialogContentState>(null);

  return (
    <>
      <section className="bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {leaders.map((leader) => (
              <Card
                key={leader.title}
                className="overflow-hidden border-t-4 border-blue-600 transition-all duration-300 hover:shadow-xl"
              >
                <CardContent className="p-8">
                  <div className="mb-6 flex items-start gap-6">
                    <div className="relative">
                      <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-blue-600 ring-4 ring-blue-100">
                        <ImageWithFallback src={leader.image} alt={leader.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="absolute -right-2 -bottom-2 rounded-full bg-blue-600 p-2">
                        <GraduationCap className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-1 flex items-center gap-2 text-blue-800">
                        <Users className="h-5 w-5" />
                        {leader.title}
                      </h3>
                      <p className="text-gray-600">{leader.name}</p>
                    </div>
                  </div>
                  <p className="mb-6 leading-relaxed text-gray-700">{leader.message}</p>
                  <Button variant="outline" className="group" onClick={() => setDialogContent({ type: "message", ...leader })}>
                    Read Full Message
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Dialog open={dialogContent !== null} onOpenChange={(open) => !open && setDialogContent(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {dialogContent?.type === "message" && (
            <>
              <DialogHeader>
                <DialogTitle>{dialogContent.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-full">
                    <ImageWithFallback src={dialogContent.image} alt={dialogContent.name} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className="text-gray-900">{dialogContent.name}</p>
                    <p className="text-sm text-gray-600">{dialogContent.designation}</p>
                  </div>
                </div>
                <p className="leading-relaxed whitespace-pre-line text-gray-700">{dialogContent.fullMessage}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function FacultiesSection({ faculties }: { faculties: Faculty[] }) {
  const [selected, setSelected] = useState<Faculty | null>(null);

  if (faculties.length === 0) return null;

  return (
    <>
      <section className="bg-gradient-to-b from-gray-50 to-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-gray-900">Faculties</h2>
            <p className="mx-auto max-w-3xl text-gray-600">
              Join a community of scholars, innovators and leaders where creativity, critical thinking and
              collaboration thrive.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {faculties.map((faculty) => (
              <Card key={faculty.id} className="group overflow-hidden transition-all duration-300 hover:shadow-2xl">
                <div className="relative h-48 overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${faculty.color} opacity-90`} />
                  <ImageWithFallback
                    src={faculty.image}
                    alt={faculty.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/90 shadow-lg backdrop-blur-sm">
                      <BookOpen className="h-10 w-10 text-blue-600" />
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  <h3 className="mb-2 text-gray-900">{faculty.name}</h3>
                  <p className="mb-3 text-sm text-red-600">{faculty.dean}</p>
                  <p className="mb-6 line-clamp-3 text-sm text-gray-600">{faculty.description}</p>
                  <Button variant="default" className="group/btn w-full" onClick={() => setSelected(faculty)}>
                    View Detail
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative h-48 overflow-hidden rounded-lg">
                  <div className={`absolute inset-0 bg-gradient-to-br ${selected.color} opacity-90`} />
                  <ImageWithFallback src={selected.image} alt={selected.name} className="h-full w-full object-cover" />
                </div>
                <p className="text-gray-600">{selected.dean}</p>
                <p className="leading-relaxed text-gray-700">{selected.fullDetail}</p>
                <div>
                  <p className="mb-2 text-gray-900">Programs Offered:</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.programs.map((program) => (
                      <Badge key={program} variant="secondary">
                        {program}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function NewsSection({ news }: { news: NewsItem[] }) {
  const [selected, setSelected] = useState<NewsItem | null>(null);

  if (news.length === 0) return null;

  return (
    <>
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="mb-2 text-gray-900">Latest News &amp; Announcements</h2>
              <p className="text-gray-600">Stay updated with the latest happenings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {news.map((item) => (
              <Card key={item.id} className="transition-shadow hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-3 flex items-start justify-between">
                    {item.category && <Badge variant="secondary">{item.category}</Badge>}
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      {new Date(item.date).toLocaleDateString()}
                    </div>
                  </div>
                  <h3 className="mb-2 text-gray-900">{item.title}</h3>
                  <Button variant="link" className="h-auto p-0" onClick={() => setSelected(item)}>
                    Read More →
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  {selected.category && <Badge variant="secondary">{selected.category}</Badge>}
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    {new Date(selected.date).toLocaleDateString()}
                  </div>
                </div>
                <p className="leading-relaxed text-gray-700">{selected.fullMessage}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

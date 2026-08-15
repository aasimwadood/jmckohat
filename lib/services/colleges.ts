import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type PublicCollege = {
  id: string;
  name: string;
  code: string;
  slug: string;
  logoPath: string | null;
  faviconPath: string | null;
  bannerPath: string | null;
  principalName: string | null;
  principalPhotoPath: string | null;
  aboutContent: string | null;
  address: string | null;
  contactNumber: string | null;
  email: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  themeColor: string | null;
};

/**
 * Resolves a college by its public slug. `cache()`-wrapped so the layout
 * and every page under app/college/[slug]/* share one query per request
 * instead of each re-fetching the same row.
 */
export const getCollegeBySlug = cache(async (slug: string): Promise<PublicCollege | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("colleges")
    .select(
      "id, name, code, slug, logo_path, favicon_path, banner_path, principal_name, principal_photo_path, about_content, address, contact_number, email, facebook_url, twitter_url, youtube_url, theme_color, status",
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!data || !data.slug) return null;

  return {
    id: data.id,
    name: data.name,
    code: data.code,
    slug: data.slug,
    logoPath: data.logo_path,
    faviconPath: data.favicon_path,
    bannerPath: data.banner_path,
    principalName: data.principal_name,
    principalPhotoPath: data.principal_photo_path,
    aboutContent: data.about_content,
    address: data.address,
    contactNumber: data.contact_number,
    email: data.email,
    facebookUrl: data.facebook_url,
    twitterUrl: data.twitter_url,
    youtubeUrl: data.youtube_url,
    themeColor: data.theme_color,
  };
});

export async function listActiveColleges(): Promise<PublicCollege[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("colleges")
    .select(
      "id, name, code, slug, logo_path, favicon_path, banner_path, principal_name, principal_photo_path, about_content, address, contact_number, email, facebook_url, twitter_url, youtube_url, theme_color, status",
    )
    .eq("status", "active")
    .not("slug", "is", null)
    .order("name");

  return (data ?? [])
    .filter((c) => c.slug)
    .map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      slug: c.slug as string,
      logoPath: c.logo_path,
      faviconPath: c.favicon_path,
      bannerPath: c.banner_path,
      principalName: c.principal_name,
      principalPhotoPath: c.principal_photo_path,
      aboutContent: c.about_content,
      address: c.address,
      contactNumber: c.contact_number,
      email: c.email,
      facebookUrl: c.facebook_url,
      twitterUrl: c.twitter_url,
      youtubeUrl: c.youtube_url,
      themeColor: c.theme_color,
    }));
}

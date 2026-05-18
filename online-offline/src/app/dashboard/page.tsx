"use client";

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase/useSupabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NextImage from 'next/image';

import {
  fetchCurrentPeriodDraft,
  getCurrentPeriod,
  deleteContent,
  withdrawContent
} from '@/lib/supabase/content';
import {
  getUserCollabs,
  leaveCollab,
} from '@/lib/supabase/collabs';
import {
  getDraftCommunications,
  getSubmittedCommunications,
  withdrawCommunication,
  deleteDraftCommunication
} from '@/lib/supabase/communications';

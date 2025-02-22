#!/bin/bash
psql -h $SUPABASE_HOST -p $SUPABASE_PORT -U $SUPABASE_USER -d postgres -c "TRUNCATE TABLE conversation_items RESTART IDENTITY;"
